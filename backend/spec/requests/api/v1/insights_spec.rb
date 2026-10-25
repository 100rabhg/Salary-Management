require "rails_helper"

RSpec.describe "Insights API", type: :request do
  let!(:rate_set) { cache_rate_set }

  before { create_insight_fixture }

  def body = response.parsed_body

  describe "GET /api/v1/insights/summary" do
    it "returns the dashboard figures in INR by default, with the conversion used" do
      get "/api/v1/insights/summary"

      expect(response).to have_http_status(:ok)
      expect(body).to include("headcount" => 5, "without_current_salary" => 1,
        "monthly_cost" => "1775000.00", "annual_cost" => "21300000.00")
      expect(body["conversion"]).to include("display_currency" => "INR", "status" => "current",
        "rates_token" => rate_set.token, "provider" => "ECB", "rate_date" => rate_set.rate_date.iso8601)
      expect(body["conversion"]["rates"]).to eq("EUR" => "100.0", "INR" => "1.0", "JPY" => "0.625", "USD" => "80.0")
      expect(body["by_currency"].first).to include("currency" => "USD", "monthly_cost_original" => "10000.00",
        "rate" => "80.0", "monthly_cost" => "800000.00")
    end

    it "converts with the pinned rates even after a newer set is cached" do
      cache_rate_set(rate_date: Date.current, rates: InsightsHelpers::FIXTURE_RATES.merge("USD" => "2"))

      get "/api/v1/insights/summary", params: { currency: "INR", rates_token: rate_set.token }

      expect(body["monthly_cost"]).to eq("1775000.00")
      expect(body["conversion"]["rates_token"]).to eq(rate_set.token)
    end

    it "can pin \"no rates\" so every report on a page agrees" do
      get "/api/v1/insights/summary", params: { rates_token: "none" }

      expect(body["conversion"]).to include("status" => "unavailable", "rates_token" => nil)
      expect(body["monthly_cost"]).to be_nil
    end

    it "asks the page to re-pin when its rates are no longer cached, as after a restart" do
      Rails.cache.clear

      get "/api/v1/insights/summary", params: { rates_token: rate_set.token }

      expect(response).to have_http_status(:conflict)
      expect(body["error"]["code"]).to eq("unknown_rates_token")
    end

    it "rejects an unsupported currency" do
      get "/api/v1/insights/summary", params: { currency: "AUD" }

      expect(response).to have_http_status(:unprocessable_content)
      expect(body["error"]).to include("code" => "invalid_parameter", "details" => { "currency" => [ "is not a supported currency" ] })
    end

    it "still answers with headcount and original-currency figures when no rates are cached" do
      Rails.cache.clear

      get "/api/v1/insights/summary"

      expect(response).to have_http_status(:ok)
      expect(body).to include("headcount" => 5, "monthly_cost" => nil)
      expect(body["conversion"]).to include("status" => "unavailable", "rates_token" => nil, "rates" => {})
      expect(body["by_currency"].map { |row| row["monthly_cost_original"] }).to all(be_present)
    end
  end

  describe "GET /api/v1/insights/department_costs" do
    it "returns monthly cost per department with its own filters" do
      get "/api/v1/insights/department_costs", params: { currency: "USD", country_code: "US", rates_token: rate_set.token }

      expect(body["data"]).to eq([ { "department" => "Engineering", "headcount" => 1, "without_current_salary" => 0,
        "monthly_cost" => "10000.00", "share_percent" => 100.0 } ])
      expect(body["conversion"]).to include("display_currency" => "USD", "status" => "not_needed")
    end
  end

  describe "GET /api/v1/insights/role_salary_ranges" do
    it "returns annual ranges per job title" do
      get "/api/v1/insights/role_salary_ranges", params: { currency: "JPY", department: "Engineering" }

      expect(body["data"]).to eq([ { "job_title" => "Software Engineer", "headcount" => 2,
        "min" => "1920000.00", "p25" => "5280000.00", "median" => "8640000.00", "p75" => "12000000.00",
        "max" => "15360000.00", "mean" => "8640000.00" } ])
    end
  end

  describe "GET /api/v1/insights/country_salary_distribution" do
    it "returns every country and does not accept a country filter" do
      get "/api/v1/insights/country_salary_distribution", params: { country_code: "US", job_title: "Account Executive" }

      expect(body["data"].size).to eq(8)
      expect(body["data"].first).to include("country_code" => "DE", "country_name" => "Germany", "headcount" => 1,
        "median" => "6000000.00")
      expect(body["data"].find { |row| row["country_code"] == "US" }).to include("headcount" => 0, "median" => nil)
    end
  end
end

RSpec.describe "GET /api/v1/exchange_rates/current", type: :request do
  it "fetches from Frankfurter when nothing is cached and returns the set with its token" do
    stub_frankfurter
    travel_to Time.zone.parse("2026-10-25 12:00") do
      get "/api/v1/exchange_rates/current"
    end

    body = response.parsed_body
    expect(body["status"]).to eq("current")
    expect(body["rate_set"]).to include("provider" => "ECB", "base" => "EUR", "rate_date" => "2026-10-23")
    expect(body["rate_set"]["token"]).to eq(ExchangeRates::Store.latest.token)
    expect(body["rate_set"]["rates"]).to include("EUR" => "1.0", "INR" => "106.272")
  end

  it "reports unavailable rates and stale ones" do
    stub_request(:get, /frankfurter/).to_timeout
    get "/api/v1/exchange_rates/current"
    expect(response.parsed_body).to eq("rate_set" => nil, "status" => "unavailable")

    cache_rate_set(rate_date: Date.current - 10, checked_at: Time.current)
    get "/api/v1/exchange_rates/current"
    expect(response.parsed_body["status"]).to eq("stale")
  end
end
