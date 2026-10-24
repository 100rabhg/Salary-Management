require "rails_helper"

RSpec.describe "Employees API", type: :request do
  def employee_attributes(**overrides)
    {
      first_name: "Ada", last_name: "Okafor", email: "ada.okafor@acme.example",
      job_title: "Software Engineer", department: "Engineering", country_code: "GB",
      employment_type: "full_time", hire_date: "2020-03-01"
    }.merge(overrides)
  end

  def create_employee(salary: 72_000, currency: nil, **overrides)
    result = Employee.create_with_first_salary(employee_attributes(**overrides), { salary:, currency: }.compact)
    raise result.employee.errors.full_messages.inspect unless result.saved?

    result.employee
  end

  def error = response.parsed_body["error"]

  describe "GET /api/v1/employees" do
    it "returns a page of employees with their current and pending salary" do
      employee = create_employee
      EmployeeSalary.create!(employee:, salary: 80_000, effective_on: Date.current - 1)
      pending = EmployeeSalary.create!(employee:, salary: 90_000, currency: "USD", effective_on: Date.current + 3)

      get "/api/v1/employees"

      row = response.parsed_body["data"].sole
      expect(row).to include("id" => employee.id, "first_name" => "Ada", "country_name" => "United Kingdom")
      expect(row["current_salary"]).to include("salary" => "80000.00", "currency" => "GBP",
        "effective_on" => (Date.current - 1).iso8601)
      expect(row["pending_salary"]).to include("id" => pending.id, "salary" => "90000.00", "currency" => "USD")
      expect(response.parsed_body["meta"]).to eq("page" => 1, "per_page" => 25, "total" => 1, "total_pages" => 1)
    end

    it "paginates on the server and clamps the page size" do
      3.times { |index| create_employee(email: "e#{index}@acme.example", last_name: "Name#{index}") }

      get "/api/v1/employees", params: { page: 2, per_page: 2 }

      expect(response.parsed_body["data"].map { |row| row["last_name"] }).to eq([ "Name2" ])
      expect(response.parsed_body["meta"]).to eq("page" => 2, "per_page" => 2, "total" => 3, "total_pages" => 2)

      get "/api/v1/employees", params: { per_page: 1_000 }
      expect(response.parsed_body["meta"]["per_page"]).to eq(100)
    end

    it "returns an empty page past the end" do
      create_employee

      get "/api/v1/employees", params: { page: 5 }

      expect(response.parsed_body["data"]).to eq([])
      expect(response.parsed_body["meta"]).to include("page" => 5, "total" => 1)
    end

    it "searches names and email case-insensitively and escapes wildcards" do
      create_employee
      create_employee(first_name: "Wei", last_name: "Chen", email: "wei_chen@acme.example")

      get "/api/v1/employees", params: { q: "ada ok" }
      expect(response.parsed_body["data"].map { |row| row["first_name"] }).to eq([ "Ada" ])

      get "/api/v1/employees", params: { q: "WEI_" }
      expect(response.parsed_body["data"].map { |row| row["first_name"] }).to eq([ "Wei" ])

      get "/api/v1/employees", params: { q: "%" }
      expect(response.parsed_body["data"]).to eq([])
    end

    it "filters by country, department, job title and employment type" do
      create_employee
      create_employee(email: "in@acme.example", country_code: "IN", department: "Sales",
        job_title: "Account Executive", employment_type: "contract")

      get "/api/v1/employees", params: { country_code: "IN", department: "Sales",
        job_title: "Account Executive", employment_type: "contract" }

      expect(response.parsed_body["data"].map { |row| row["email"] }).to eq([ "in@acme.example" ])
    end

    it "sorts by an allowed column and ignores unknown ones" do
      create_employee(last_name: "Zed", hire_date: "2019-01-01")
      create_employee(last_name: "Abe", email: "abe@acme.example", hire_date: "2021-01-01")

      get "/api/v1/employees", params: { sort: "hire_date", direction: "desc" }
      expect(response.parsed_body["data"].map { |row| row["last_name"] }).to eq(%w[Abe Zed])

      get "/api/v1/employees", params: { sort: "salary; DROP TABLE employees" }
      expect(response.parsed_body["data"].map { |row| row["last_name"] }).to eq(%w[Abe Zed])
    end

    it "sorts by role and by country name" do
      create_employee(last_name: "Germany", country_code: "DE", job_title: "Recruiter")
      create_employee(last_name: "France", email: "fr@acme.example", country_code: "FR", job_title: "Accountant")
      create_employee(last_name: "India", email: "in@acme.example", country_code: "IN", job_title: "QA Engineer")

      get "/api/v1/employees", params: { sort: "country" }
      expect(response.parsed_body["data"].map { |row| row["last_name"] }).to eq(%w[France Germany India])

      get "/api/v1/employees", params: { sort: "job_title", direction: "desc" }
      expect(response.parsed_body["data"].map { |row| row["job_title"] }).to eq([ "Recruiter", "QA Engineer", "Accountant" ])
    end

    it "sorts by current salary within each currency, with no current salary last" do
      create_employee(last_name: "Gbp", salary: 50_000, currency: "GBP")
      create_employee(last_name: "UsdHigh", email: "a@acme.example", salary: 90_000, currency: "USD")
      create_employee(last_name: "UsdLow", email: "b@acme.example", salary: 80_000, currency: "USD")
      later = create_employee(last_name: "NoCurrent", email: "c@acme.example", hire_date: Date.current.iso8601)
      later.employee_salaries.sole.update!(effective_on: Date.current + 5)

      get "/api/v1/employees", params: { sort: "salary" }
      expect(response.parsed_body["data"].map { |row| row["last_name"] }).to eq(%w[Gbp UsdLow UsdHigh NoCurrent])

      get "/api/v1/employees", params: { sort: "salary", direction: "desc" }
      expect(response.parsed_body["data"].map { |row| row["last_name"] }).to eq(%w[UsdHigh UsdLow Gbp NoCurrent])
    end
  end

  describe "GET /api/v1/employees/:id" do
    it "returns the employee" do
      employee = create_employee

      get "/api/v1/employees/#{employee.id}"

      expect(response.parsed_body).to include("email" => "ada.okafor@acme.example", "lock_version" => 0,
        "pending_salary" => nil)
      expect(response.parsed_body["current_salary"]).to include("salary" => "72000.00", "effective_on" => "2020-03-01")
    end

    it "returns 404 for an unknown employee" do
      get "/api/v1/employees/0"

      expect(response).to have_http_status(:not_found)
      expect(error["code"]).to eq("not_found")
    end
  end

  describe "POST /api/v1/employees" do
    it "creates the employee and their first salary record, effective on the joining date" do
      post "/api/v1/employees", params: {
        employee: employee_attributes(country_code: "IN", first_salary: { salary: "1500000" })
      }, as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["current_salary"])
        .to include("salary" => "1500000.00", "currency" => "INR", "effective_on" => "2020-03-01")
    end

    it "accepts a currency other than the country's" do
      post "/api/v1/employees", params: {
        employee: employee_attributes(first_salary: { salary: "90000", currency: "USD" })
      }, as: :json

      expect(response.parsed_body["current_salary"]).to include("currency" => "USD")
    end

    it "returns every validation error, keyed by field, and saves nothing" do
      expect {
        post "/api/v1/employees", params: {
          employee: employee_attributes(email: "nope", hire_date: (Date.current + 1).iso8601, first_salary: { salary: "0" })
        }, as: :json
      }.not_to change(Employee, :count)

      expect(response).to have_http_status(:unprocessable_content)
      expect(error["code"]).to eq("validation_failed")
      expect(error["details"]).to include("email", "hire_date", "first_salary.salary")
      expect(EmployeeSalary.count).to eq(0)
    end

    it "rejects a duplicate email regardless of case" do
      create_employee

      post "/api/v1/employees", params: {
        employee: employee_attributes(email: "ADA.OKAFOR@acme.example", first_salary: { salary: "1" })
      }, as: :json

      expect(error["details"]["email"]).to include("has already been taken")
    end

    it "returns 400 without an employee payload" do
      post "/api/v1/employees", params: {}, as: :json

      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "PATCH /api/v1/employees/:id" do
    it "updates the employee and leaves salary records untouched when the country changes" do
      employee = create_employee
      EmployeeSalary.create!(employee:, salary: 80_000, effective_on: Date.current + 2)

      expect {
        patch "/api/v1/employees/#{employee.id}",
          params: { employee: { country_code: "IN", job_title: "QA Engineer", lock_version: 0 } }, as: :json
      }.not_to(change { EmployeeSalary.order(:id).pluck(:salary, :currency, :effective_on) })

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include("country_code" => "IN", "job_title" => "QA Engineer", "lock_version" => 1)
      expect(response.parsed_body["current_salary"]).to include("currency" => "GBP")
    end

    it "moves the first salary record with a corrected joining date" do
      employee = create_employee

      patch "/api/v1/employees/#{employee.id}", params: { employee: { hire_date: "2020-04-01" } }, as: :json

      expect(response.parsed_body["current_salary"]).to include("effective_on" => "2020-04-01")
    end

    it "returns 409 when the record changed since it was loaded" do
      employee = create_employee
      employee.update!(job_title: "QA Engineer")

      patch "/api/v1/employees/#{employee.id}",
        params: { employee: { job_title: "Recruiter", lock_version: 0 } }, as: :json

      expect(response).to have_http_status(:conflict)
      expect(error["code"]).to eq("stale_record")
      expect(employee.reload.job_title).to eq("QA Engineer")
    end

    it "returns validation errors" do
      employee = create_employee

      patch "/api/v1/employees/#{employee.id}", params: { employee: { first_name: " " } }, as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(error["details"]).to eq("first_name" => [ "can't be blank" ])
    end
  end

  describe "DELETE /api/v1/employees/:id" do
    it "deletes the employee and all their salary records" do
      employee = create_employee
      EmployeeSalary.create!(employee:, salary: 80_000, effective_on: Date.current + 2)

      delete "/api/v1/employees/#{employee.id}"

      expect(response).to have_http_status(:no_content)
      expect(Employee.count).to eq(0)
      expect(EmployeeSalary.count).to eq(0)
    end
  end

  it "allows the configured frontend origin" do
    get "/api/v1/employees", headers: { "Origin" => "http://localhost:5173" }

    expect(response.headers["Access-Control-Allow-Origin"]).to eq("http://localhost:5173")
  end
end
