require "rails_helper"

RSpec.describe "GET /api/v1/meta", type: :request do
  it "returns today's business date and the reference data" do
    Employee.create_with_first_salary(
      { first_name: "Ada", last_name: "Okafor", email: "ada@acme.example", job_title: "Recruiter",
        department: "People", country_code: "IN", employment_type: "full_time", hire_date: Date.new(2022, 1, 3) },
      { salary: 1_200_000 }
    )

    travel_to Time.utc(2026, 10, 24, 19, 0) do # 00:30 on 25 October in Kolkata
      get "/api/v1/meta"
    end

    body = response.parsed_body
    expect(response).to have_http_status(:ok)
    expect(body).to include("today" => "2026-10-25", "time_zone" => "Asia/Kolkata", "default_currency" => "INR")
    expect(body["countries"]).to include({ "code" => "IN", "name" => "India", "currency" => "INR" })
    expect(body["currencies"]).to include({ "code" => "JPY", "zero_decimal" => true })
    expect(body["employment_types"]).to eq(%w[full_time part_time contract])
    expect(body).to include("departments" => [ "People" ], "job_titles" => [ "Recruiter" ])
  end
end
