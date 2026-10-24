class Employee < ApplicationRecord
  NAME_MAX_LENGTH = 100

  # The result of .create_with_first_salary: both records carry their errors.
  NewEmployee = Data.define(:employee, :first_salary) do
    def saved? = employee.persisted?
  end

  has_many :employee_salaries, -> { order(effective_on: :desc) },
    inverse_of: :employee, dependent: :destroy

  enum :employment_type,
    { full_time: "full_time", part_time: "part_time", contract: "contract" },
    validate: true

  normalizes :first_name, :last_name, :job_title, :department, with: ->(value) { value.strip }
  normalizes :email, with: ->(value) { value.strip.downcase }

  validates :first_name, :last_name, :job_title, :department,
    presence: true, length: { maximum: NAME_MAX_LENGTH }
  validates :email, presence: true, length: { maximum: 254 },
    format: { with: URI::MailTo::EMAIL_REGEXP }, uniqueness: { case_sensitive: false }
  validates :country_code, inclusion: { in: Country.codes, message: "is not a supported country" }
  validates :hire_date, presence: true

  validate :hire_date_not_in_future
  validate :hire_date_not_after_first_salary, on: :update, if: :will_save_change_to_hire_date?

  # Creates the employee and their first salary record in one transaction.
  # The joining date (hire_date) is the first record's effective date.
  def self.create_with_first_salary(attributes, first_salary_attributes)
    employee = new(attributes)
    first_salary = EmployeeSalary.new(
      first_salary_attributes.to_h.merge(employee:, effective_on: employee.hire_date)
    )
    result = NewEmployee.new(employee:, first_salary:)

    # Validate both up front so the caller gets every error at once.
    return result unless [ employee.valid?, first_salary.valid? ].all?

    transaction do
      employee.save!
      first_salary.save!
    end
    result
  end

  # Updates the employee under a row lock. If the joining date changes and the
  # first salary record was effective from the old joining date, that record
  # moves with it, so correcting a mistyped joining date is a single edit.
  # Country changes never touch salary records.
  def update_with_lock(attributes)
    with_lock do
      previous_hire_date = hire_date
      assign_attributes(attributes)
      first_salary = employee_salaries.min_by(&:effective_on)
      move_first_salary = hire_date_changed? && first_salary&.effective_on == previous_hire_date
      first_salary.effective_on = hire_date if move_first_salary

      employee_valid = valid?
      if move_first_salary && !first_salary.valid?
        first_salary.errors.full_messages.each do |message|
          errors.add(:hire_date, "can't move the first salary record: #{message}")
        end
      end
      next false unless employee_valid && errors.empty?

      save!
      first_salary.save! if move_first_salary
      true
    end
  end

  def current_salary_period(today = Date.current)
    employee_salaries.effective_on_or_before(today).first
  end

  def pending_salary_period(today = Date.current)
    employee_salaries.pending(today).reorder(effective_on: :asc).first
  end

  def current_salary
    current_salary_period&.salary
  end

  def current_currency
    current_salary_period&.currency
  end

  private

  def hire_date_not_in_future
    return unless hire_date && hire_date > Date.current

    errors.add(:hire_date, "can't be in the future")
  end

  # Uses the loaded records, so a first record moved by #update_with_lock
  # counts at its new date.
  def hire_date_not_after_first_salary
    first_effective_on = employee_salaries.map(&:effective_on).compact.min
    return unless hire_date && first_effective_on && hire_date > first_effective_on

    errors.add(:hire_date, "can't be after the first salary record (#{first_effective_on.iso8601})")
  end
end
