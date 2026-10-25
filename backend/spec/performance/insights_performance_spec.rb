require "rails_helper"

# Runs every insight report against the full 10,000-employee seed. The limit
# is generous so slower CI machines pass; real timings are recorded in
# docs/performance-considerations.md.
RSpec.describe "Insight reports at 10,000 employees", type: :request do
  limit_ms = 1_000

  before do
    EmployeeSeed.new(count: 10_000).call
    @rates_token = cache_rate_set.token
  end

  {
    "summary" => {},
    "department_costs" => { country_code: "IN" },
    "role_salary_ranges" => { currency: "JPY" },
    "country_salary_distribution" => { department: "Engineering", currency: "USD" }
  }.each do |report, params|
    it "answers /insights/#{report} within #{limit_ms} ms" do
      get "/api/v1/insights/#{report}", params: params.merge(rates_token: @rates_token) # warm up
      started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      get "/api/v1/insights/#{report}", params: params.merge(rates_token: @rates_token)
      elapsed_ms = (Process.clock_gettime(Process::CLOCK_MONOTONIC) - started) * 1000

      expect(response).to have_http_status(:ok)
      expect(elapsed_ms).to be < limit_ms
    end
  end

  it "covers the whole seed in the dashboard headcount" do
    get "/api/v1/insights/summary", params: { rates_token: @rates_token }

    expect(response.parsed_body["headcount"]).to eq(10_000)
    expect(response.parsed_body["by_currency"].sum { |row| row["headcount"] }).to eq(10_000)
  end
end
