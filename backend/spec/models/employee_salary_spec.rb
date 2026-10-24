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
    %i[employee salary effective_on].each do |field|
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
    it "accepts every supported currency, whatever the employee's country" do
      Country::CURRENCIES.each do |currency|
        salary = currency == "JPY" ? 7_200_000 : 72_000
        expect(described_class.new(valid_attributes(currency:, salary:))).to be_valid
      end
    end

    it "rejects an unsupported currency" do
      expect(errors_for(valid_attributes(currency: "BRL"), :currency)).to include("is not a supported currency")
    end

    it "defaults to the currency of the employee's country" do
      gb_record = described_class.create!(valid_attributes(currency: nil))
      in_record = described_class.create!(valid_attributes(employee: employee(country_code: "IN"), currency: nil))

      expect(gb_record.currency).to eq("GBP")
      expect(in_record.currency).to eq("INR")
    end
  end

  describe "effective date" do
    it "accepts the joining date, later past dates, today and the future" do
      [ Date.new(2020, 3, 1), Date.new(2021, 1, 1), Date.current, Date.current + 30 ].each do |date|
        expect(described_class.new(valid_attributes(effective_on: date))).to be_valid
      end
    end

    it "rejects a date before the joining date" do
      expect(errors_for(valid_attributes(effective_on: Date.new(2020, 2, 29)), :effective_on))
        .to include("can't be before the joining date (2020-03-01)")
    end

    it "allows one record per employee per date, in the model and the database" do
      record = described_class.create!(valid_attributes)

      duplicate = described_class.new(valid_attributes(employee: record.employee, salary: 80_000))
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:effective_on]).to include("already has a salary record on this date")
      expect { insert_without_rails(employee_id: record.employee_id) }.to raise_error(ActiveRecord::RecordNotUnique)
    end
  end

  describe "history" do
    let(:employee_record) { employee }

    def add(salary, effective_on)
      described_class.create!(valid_attributes(employee: employee_record, salary:, effective_on:))
    end

    it "allows salary increases and decreases" do
      add(80_000, Date.new(2020, 3, 1))

      expect(add(70_000, Date.current)).to be_persisted
      expect(add(90_000, Date.current + 10)).to be_persisted
    end

    it "uses the latest record effective today as the current salary" do
      add(70_000, Date.current - 2)
      current = add(75_000, Date.current - 1)
      pending = add(90_000, Date.current + 1)

      expect(employee_record.current_salary_period).to eq(current)
      expect(employee_record.current_salary).to eq(BigDecimal("75000"))
      expect(employee_record.current_currency).to eq("GBP")
      expect(employee_record.pending_salary_period).to eq(pending)
    end

    it "treats a record effective today as current, not pending" do
      record = add(75_000, Date.current)

      expect(record).not_to be_pending
      expect(employee_record.current_salary_period).to eq(record)
    end

    it "lets any record be edited to correct a mistake" do
      past = add(70_000, Date.new(2020, 3, 1))
      add(75_000, Date.current)

      past.update!(salary: 71_000, currency: "USD", effective_on: Date.new(2020, 4, 1))

      expect(past.reload).to have_attributes(salary: BigDecimal("71000"), currency: "USD")
    end
  end

  describe "one pending record per employee" do
    let(:employee_record) { employee }

    def build(effective_on)
      described_class.new(valid_attributes(employee: employee_record, effective_on:, salary: 80_000))
    end

    it "rejects a second future-dated record" do
      build(Date.current + 5).save!
      second = build(Date.current + 10)

      expect(second).not_to be_valid
      expect(second.errors[:effective_on].first).to start_with("can't be in the future: a salary change is already scheduled")
    end

    it "still allows past and today-dated records while one is pending" do
      build(Date.current + 5).save!

      expect(build(Date.new(2021, 1, 1))).to be_valid
      expect(build(Date.current)).to be_valid
    end

    it "lets the pending record itself be edited" do
      pending = build(Date.current + 5)
      pending.save!

      expect(pending.update(effective_on: Date.current + 20, salary: 85_000)).to be(true)
    end

    it "rejects moving another record into the future while one is pending" do
      past = build(Date.new(2021, 1, 1))
      past.save!
      build(Date.current + 5).save!

      expect(past.update(effective_on: Date.current + 9)).to be(false)
    end
  end

  describe "cancelling" do
    let(:employee_record) { employee }

    def add(effective_on)
      described_class.create!(valid_attributes(employee: employee_record, effective_on:))
    end

    it "deletes a pending record" do
      add(Date.new(2020, 3, 1))
      pending = add(Date.current + 1)

      expect(pending.destroy_with_lock).to be_truthy
      expect(described_class.exists?(pending.id)).to be(false)
    end

    it "refuses a record that has taken effect" do
      add(Date.new(2020, 3, 1))
      current = add(Date.current)

      expect(current.destroy_with_lock).to be(false)
      expect(current.errors[:base]).to include("This salary record has already taken effect and can't be cancelled; edit it instead")
    end

    it "decides by the stored date, not an unsaved edit" do
      add(Date.new(2020, 3, 1))
      current = add(Date.current)
      current.effective_on = Date.current + 3

      expect(current).not_to be_cancellable
    end

    it "refuses the employee's only record" do
      only = add(Date.current + 1)

      expect(only.destroy_with_lock).to be(false)
      expect(only.errors[:base]).to include("An employee must keep at least one salary record")
    end

    it "removes every record when the employee is deleted" do
      add(Date.new(2020, 3, 1))
      add(Date.current + 1)

      expect { employee_record.destroy! }.to change(described_class, :count).by(-2)
    end
  end

  describe "optimistic locking" do
    it "rejects a save based on an outdated copy" do
      record = described_class.create!(valid_attributes)
      described_class.find(record.id).update!(salary: 73_000)

      record.salary = 74_000
      expect { record.save }.to raise_error(ActiveRecord::StaleObjectError)
    end
  end

  # Runs real concurrent transactions, so it can't use the per-example
  # rollback; it cleans up after itself instead.
  describe "concurrent requests", :concurrency do
    self.use_transactional_tests = false

    after do
      described_class.delete_all
      Employee.delete_all
    end

    it "creates only one pending record when several are scheduled at once" do
      # Hold each request between its "one pending" check and its INSERT, so
      # without the lock every request would pass the check before any insert.
      allow_any_instance_of(described_class).to receive(:at_most_one_pending_record)
        .and_wrap_original { |original| original.call.tap { sleep 0.2 } }
      employee_record = employee
      described_class.create!(valid_attributes(employee: employee_record))
      start = Queue.new

      threads = (1..4).map do |offset|
        Thread.new do
          ActiveRecord::Base.connection_pool.with_connection do
            start.pop
            record = described_class.new(
              employee: Employee.find(employee_record.id), salary: 80_000, currency: "GBP",
              effective_on: Date.current + offset
            )
            record.save_with_lock
          end
        end
      end
      4.times { start << true }
      results = threads.map(&:value)

      expect(results.count(true)).to eq(1)
      expect(described_class.pending.where(employee_id: employee_record.id).count).to eq(1)
    end
  end
end
