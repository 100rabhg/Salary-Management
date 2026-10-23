require "rails_helper"

RSpec.describe EmployeeSalary do
  def employee(country_code: "GB")
    Employee.create!(
      first_name: "Ada",
      last_name: "Okafor",
      email: "ada.#{SecureRandom.hex(4)}@acme.example",
      job_title: "Software Engineer",
      department: "Engineering",
      country_code:,
      employment_type: "full_time",
      hire_date: Date.new(2020, 3, 1)
    )
  end

  def valid_attributes(**overrides)
    {
      salary: BigDecimal("72000"),
      currency: "GBP",
      effective_on: Date.new(2020, 3, 1)
    }.merge(overrides).tap do |attributes|
      attributes[:employee] = employee unless attributes.key?(:employee)
    end
  end

  def insert_without_rails(**overrides)
    now = Time.current
    attributes = {
      employee_id: employee.id,
      salary: BigDecimal("72000"),
      currency: "GBP",
      effective_on: Date.new(2020, 3, 1),
      created_at: now,
      updated_at: now
    }.merge(overrides)
    connection = described_class.connection
    values = attributes.values.map { |value| connection.quote(value) }
    connection.execute(
      "INSERT INTO employee_salaries (#{attributes.keys.join(', ')}) VALUES (#{values.join(', ')})"
    )
  end

  def errors_for(attributes, field)
    salary_period = described_class.new(attributes)
    salary_period.validate
    salary_period.errors[field]
  end

  it "is valid with valid attributes" do
    expect(described_class.new(valid_attributes)).to be_valid
  end

  describe "required fields" do
    %i[employee salary currency effective_on].each do |field|
      it "requires #{field}" do
        expect(errors_for(valid_attributes(field => nil), field)).to be_present
      end
    end

    %i[employee_id salary currency effective_on].each do |field|
      it "rejects a NULL #{field} in the database" do
        expect { insert_without_rails(field => nil) }.to raise_error(ActiveRecord::NotNullViolation)
      end
    end
  end

  describe "salary" do
    [ 0, -1 ].each do |amount|
      it "rejects #{amount} in the model and database" do
        expect(described_class.new(valid_attributes(salary: amount))).not_to be_valid
        expect { insert_without_rails(salary: amount) }.to raise_error(ActiveRecord::CheckViolation)
      end
    end

    it "preserves decimal precision" do
      salary_period = described_class.create!(valid_attributes(salary: "72000.10"))

      expect(salary_period.reload.salary).to eq(BigDecimal("72000.10"))
    end

    it "requires a whole-number amount for JPY" do
      attributes = valid_attributes(employee: employee(country_code: "JP"), currency: "JPY", salary: "72000.50")

      expect(errors_for(attributes, :salary)).to include("must be a whole number for JPY")
    end
  end

  describe "currency" do
    it "accepts the mapped currency for every supported country" do
      Country::ALL.each do |code, country|
        salary_period = described_class.new(
          valid_attributes(employee: employee(country_code: code), currency: country[:currency])
        )

        expect(salary_period).to be_valid
      end
    end

    it "rejects a currency that does not match the employee country" do
      attributes = valid_attributes(currency: "USD")

      expect(errors_for(attributes, :currency)).to include("must be GBP for GB")
    end

    it "rejects an unsupported currency" do
      expect(errors_for(valid_attributes(currency: "BRL"), :currency)).to include("is not included in the list")
    end
  end

  describe "effective date and history" do
    it "accepts periods before hire and in the future" do
      salary_period = described_class.new(
        valid_attributes(effective_on: Date.new(2010, 1, 1))
      )
      future_period = described_class.new(
        valid_attributes(effective_on: Date.current + 1)
      )

      expect(salary_period).to be_valid
      expect(future_period).to be_valid
    end

    it "allows salary increases and decreases as new periods" do
      employee_record = employee
      described_class.create!(valid_attributes(employee: employee_record, salary: 80_000))
      decrease = described_class.new(
        valid_attributes(employee: employee_record, salary: 70_000, effective_on: Date.current)
      )

      expect(decrease).to be_valid
    end

    it "uses the latest effective period as the employee's current salary" do
      employee_record = employee
      described_class.create!(
        valid_attributes(employee: employee_record, salary: 70_000, effective_on: Date.current - 2)
      )
      current_period = described_class.create!(
        valid_attributes(employee: employee_record, salary: 75_000, effective_on: Date.current - 1)
      )
      described_class.create!(
        valid_attributes(employee: employee_record, salary: 90_000, effective_on: Date.current + 1)
      )

      expect(employee_record.current_salary_period).to eq(current_period)
      expect(employee_record.current_salary).to eq(BigDecimal("75000"))
      expect(employee_record.current_currency).to eq("GBP")
    end

    it "does not allow an existing period to be edited" do
      salary_period = described_class.create!(valid_attributes)
      salary_period.salary = 80_000

      expect(salary_period).not_to be_valid
      expect(salary_period.errors[:base]).to include("Salary periods cannot be changed; add a new period instead")
    end
  end
end
