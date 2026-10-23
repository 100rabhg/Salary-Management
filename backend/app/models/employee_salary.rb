class EmployeeSalary < ApplicationRecord
  belongs_to :employee

  validates :salary, presence: true, numericality: { greater_than: 0 }
  validates :currency, presence: true,
    inclusion: { in: Country::ALL.values.map { |country| country[:currency] }.uniq }
  validates :effective_on, presence: true

  validate :currency_matches_employee_country
  validate :salary_is_whole_for_zero_decimal_currency
  validate :salary_period_is_immutable, on: :update

  private

  def currency_matches_employee_country
    expected = Country.currency_for(employee&.country_code)
    return if expected.nil? || currency == expected

    errors.add(:currency, "must be #{expected} for #{employee.country_code}")
  end

  def salary_is_whole_for_zero_decimal_currency
    return unless salary && Country.zero_decimal?(currency)
    return if salary == salary.truncate

    errors.add(:salary, "must be a whole number for #{currency}")
  end

  def salary_period_is_immutable
    changed_fields = %i[employee_id salary currency effective_on].select do |field|
      public_send("will_save_change_to_#{field}?")
    end
    return if changed_fields.empty?

    errors.add(:base, "Salary periods cannot be changed; add a new period instead")
  end
end
