# Lists exactly the fields the API exposes for an employee.
class EmployeeSerializer
  FIELDS = %i[
    id first_name last_name email job_title department country_code
    employment_type hire_date lock_version
  ].freeze

  # Directory rows carry their salary columns from EmployeeDirectoryQuery.
  def self.directory_row(employee)
    new(employee).as_json(
      current: salary_from_columns(employee, "current"),
      pending: salary_from_columns(employee, "pending")
    )
  end

  def self.salary_from_columns(employee, name)
    id = employee.read_attribute("#{name}_salary_id")
    return nil unless id

    {
      id:,
      salary: SalaryAmount.format(employee.read_attribute("#{name}_salary_salary")),
      currency: employee.read_attribute("#{name}_salary_currency"),
      effective_on: employee.read_attribute("#{name}_salary_effective_on")
    }
  end

  def self.salary_summary(record)
    record && { id: record.id, salary: SalaryAmount.format(record.salary), currency: record.currency, effective_on: record.effective_on }
  end

  def initialize(employee)
    @employee = employee
  end

  def as_json(current: self.class.salary_summary(@employee.current_salary_period),
              pending: self.class.salary_summary(@employee.pending_salary_period))
    @employee.slice(*FIELDS).merge(
      country_name: Country.name_for(@employee.country_code),
      current_salary: current,
      pending_salary: pending
    )
  end
end
