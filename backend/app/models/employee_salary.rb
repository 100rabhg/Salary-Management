# One salary record: an annual base salary that applies from effective_on
# until the employee's next record.
#
# Relative to today (Date.current, in the business time zone) a record is:
# - current: the latest record effective on or before today;
# - past: any earlier record effective on or before today;
# - pending: effective after today. An employee has at most one.
#
# Any record can be edited to correct a mistake. Only a pending record can be
# cancelled (destroyed), and never the employee's last remaining record.
#
# Writes go through #save_with_lock and #destroy_with_lock, which lock the
# employee row first, so concurrent requests for one employee run one at a
# time and the "one pending record" check can't be raced (see
# docs/architecture.md).
class EmployeeSalary < ApplicationRecord
  belongs_to :employee

  scope :chronological, -> { order(effective_on: :asc) }
  scope :effective_on_or_before, ->(date) { where(effective_on: ..date) }
  scope :pending, ->(today = Date.current) { where(effective_on: (today + 1)..) }

  before_validation :default_currency, on: :create

  validates :salary, presence: true, numericality: { greater_than: 0 }
  validates :currency, inclusion: { in: Country::CURRENCIES, message: "is not a supported currency" }
  validates :effective_on, presence: true,
    uniqueness: { scope: :employee_id, message: "already has a salary record on this date" }

  validate :salary_is_whole_for_zero_decimal_currency
  validate :effective_on_not_before_hire_date
  validate :at_most_one_pending_record

  before_destroy :ensure_cancellable, unless: :destroyed_by_association

  def pending?(today = Date.current)
    effective_on.present? && effective_on > today
  end

  # Cancelling is decided by the stored date, not an unsaved edit.
  def cancellable?(today = Date.current)
    persisted? && effective_on_in_database > today &&
      EmployeeSalary.where(employee_id:).where.not(id:).exists?
  end

  def save_with_lock
    employee.with_lock { save }
  end

  def destroy_with_lock
    employee.with_lock { destroy }
  end

  private

  def default_currency
    self.currency = Country.default_currency_for(employee&.country_code) if currency.blank?
  end

  def salary_is_whole_for_zero_decimal_currency
    return unless salary && Country.zero_decimal?(currency)
    return if salary == salary.truncate

    errors.add(:salary, "must be a whole number for #{currency}")
  end

  def effective_on_not_before_hire_date
    hire_date = employee&.hire_date
    return unless effective_on && hire_date && effective_on < hire_date

    errors.add(:effective_on, "can't be before the joining date (#{hire_date.iso8601})")
  end

  # Reads the database, so it is only race-free inside the employee lock.
  def at_most_one_pending_record
    return unless employee_id && pending?

    other = EmployeeSalary.pending.where(employee_id:).where.not(id:).first
    return unless other

    errors.add(:effective_on,
      "can't be in the future: a salary change is already scheduled for #{other.effective_on.iso8601}. " \
      "Edit or cancel that change instead")
  end

  def ensure_cancellable
    return if cancellable?

    message = if effective_on_in_database <= Date.current
      "This salary record has already taken effect and can't be cancelled; edit it instead"
    else
      "An employee must keep at least one salary record"
    end
    errors.add(:base, message)
    throw :abort
  end
end
