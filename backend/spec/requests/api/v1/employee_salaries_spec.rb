require "rails_helper"

RSpec.describe "Employee salary records API", type: :request do
  let(:employee) do
    Employee.create_with_first_salary(
      { first_name: "Ada", last_name: "Okafor", email: "ada@acme.example", job_title: "Recruiter",
        department: "People", country_code: "IN", employment_type: "full_time", hire_date: Date.new(2022, 1, 3) },
      { salary: 1_000_000 }
    ).employee
  end
  let(:path) { "/api/v1/employees/#{employee.id}/salaries" }

  def first_record = employee.employee_salaries.min_by(&:effective_on)
  def error = response.parsed_body["error"]
  def statuses = response.parsed_body["data"].map { |row| row["status"] }

  def add(salary:, effective_on:, currency: nil)
    post path, params: { salary_record: { salary:, effective_on:, currency: }.compact }, as: :json
  end

  describe "GET" do
    it "lists the history newest first with status and change from the previous record" do
      EmployeeSalary.create!(employee:, salary: 1_100_000, effective_on: Date.current)
      EmployeeSalary.create!(employee:, salary: 1_045_000, effective_on: Date.current + 30)

      get path

      rows = response.parsed_body["data"]
      expect(rows.map { |row| [ row["status"], row["salary"] ] })
        .to eq([ %w[pending 1045000.00], %w[current 1100000.00], %w[past 1000000.00] ])
      expect(rows[0]).to include("cancellable" => true, "change" => { "amount" => "-55000.00", "percent" => -5.0 })
      expect(rows[1]).to include("cancellable" => false, "change" => { "amount" => "100000.00", "percent" => 10.0 })
      expect(rows[2]["change"]).to be_nil
    end

    it "leaves the change empty between records in different currencies" do
      EmployeeSalary.create!(employee:, salary: 15_000, currency: "USD", effective_on: Date.current)

      get path

      expect(response.parsed_body["data"].first["change"]).to be_nil
    end

    it "uses the business time zone to decide what has taken effect" do
      EmployeeSalary.create!(employee:, salary: 1_100_000, effective_on: Date.new(2026, 10, 25))

      travel_to Time.utc(2026, 10, 24, 18, 0) do # 23:30 on 24 October in Kolkata
        get path
        expect(statuses).to eq(%w[pending current])
      end
      travel_to Time.utc(2026, 10, 24, 19, 0) do # 00:30 on 25 October in Kolkata
        get path
        expect(statuses).to eq(%w[current past])
      end
    end
  end

  describe "POST" do
    it "adds a pending change and returns the updated history" do
      add(salary: "1200000", effective_on: (Date.current + 10).iso8601)

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["data"].first)
        .to include("status" => "pending", "salary" => "1200000.00", "currency" => "INR")
    end

    it "allows back-dated and today-dated changes, increases and decreases" do
      add(salary: "900000", effective_on: "2023-01-01")
      expect(response).to have_http_status(:created)

      add(salary: "950000", effective_on: Date.current.iso8601)
      expect(statuses).to eq(%w[current past past])
    end

    it "accepts a currency other than the country's" do
      add(salary: "15000", currency: "USD", effective_on: Date.current.iso8601)

      expect(response.parsed_body["data"].first["currency"]).to eq("USD")
    end

    it "rejects a second pending change" do
      add(salary: "1200000", effective_on: (Date.current + 10).iso8601)
      add(salary: "1300000", effective_on: (Date.current + 20).iso8601)

      expect(response).to have_http_status(:unprocessable_content)
      expect(error["details"]["effective_on"].first).to include("already scheduled for #{(Date.current + 10).iso8601}")
    end

    it "rejects a date before joining, a duplicate date and invalid amounts" do
      add(salary: "1", effective_on: "2021-12-31")
      expect(error["details"]["effective_on"]).to include("can't be before the joining date (2022-01-03)")

      add(salary: "1", effective_on: "2022-01-03")
      expect(error["details"]["effective_on"]).to include("already has a salary record on this date")

      add(salary: "-5", effective_on: "2023-01-01")
      expect(error["details"]["salary"]).to include("must be greater than 0")

      add(salary: "100.5", currency: "JPY", effective_on: "2023-01-01")
      expect(error["details"]["salary"]).to include("must be a whole number for JPY")
    end
  end

  describe "PATCH" do
    it "corrects any record, including the first one" do
      patch "#{path}/#{first_record.id}",
        params: { salary_record: { salary: "1010000", lock_version: 0 } }, as: :json

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["data"].first).to include("salary" => "1010000.00", "lock_version" => 1)
    end

    it "edits the pending change" do
      pending = EmployeeSalary.create!(employee:, salary: 1_200_000, effective_on: Date.current + 10)

      patch "#{path}/#{pending.id}",
        params: { salary_record: { salary: "1250000", effective_on: (Date.current + 15).iso8601 } }, as: :json

      expect(response.parsed_body["data"].first)
        .to include("status" => "pending", "salary" => "1250000.00", "effective_on" => (Date.current + 15).iso8601)
    end

    it "returns 409 for an outdated copy" do
      first_record.update!(salary: 1_020_000)

      patch "#{path}/#{first_record.id}",
        params: { salary_record: { salary: "1030000", lock_version: 0 } }, as: :json

      expect(response).to have_http_status(:conflict)
      expect(error["code"]).to eq("stale_record")
    end

    it "returns 404 for another employee's record" do
      other = Employee.create_with_first_salary(
        employee.attributes.slice(*%w[first_name last_name job_title department country_code employment_type hire_date])
          .merge("email" => "other@acme.example"),
        { salary: 1 }
      ).employee

      patch "#{path}/#{other.employee_salaries.first.id}", params: { salary_record: { salary: "2" } }, as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE" do
    it "cancels the pending change" do
      pending = EmployeeSalary.create!(employee:, salary: 1_200_000, effective_on: Date.current + 10)

      delete "#{path}/#{pending.id}"

      expect(response).to have_http_status(:no_content)
      expect(EmployeeSalary.exists?(pending.id)).to be(false)
    end

    it "refuses a record that has taken effect" do
      delete "#{path}/#{first_record.id}"

      expect(response).to have_http_status(:unprocessable_content)
      expect(error["details"]["base"]).to include("This salary record has already taken effect and can't be cancelled; edit it instead")
    end
  end
end
