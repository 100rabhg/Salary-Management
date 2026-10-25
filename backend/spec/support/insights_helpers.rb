# Known data for insight specs. Every expected figure in the specs is worked
# out by hand from these values.
module InsightsHelpers
  # EUR-based rates: 1 USD = 80 INR, 1 EUR = 100 INR, 1 GBP = 125 INR,
  # 1 JPY = 0.625 INR, and INR -> JPY is exactly 1.6.
  FIXTURE_RATES = { "EUR" => 1, "INR" => 100, "USD" => "1.25", "JPY" => 160, "GBP" => "0.8", "SGD" => "1.5" }.freeze

  # Caches a rate set as the latest and returns it.
  def cache_rate_set(rate_date: Date.current - 1, rates: FIXTURE_RATES, checked_at: Time.current)
    rate_set = ExchangeRates::RateSet.new(
      provider: "ECB", base: "EUR", rate_date:, fetched_at: checked_at,
      rates: rates.to_h { |currency, rate| [ currency, BigDecimal(rate.to_s) ] }.sort.to_h
    )
    ExchangeRates::Store.write(rate_set, now: checked_at)
    rate_set
  end

  # A rate set that is not in the cache.
  def build_rate_set(rate_date: Date.current - 1, rates: FIXTURE_RATES)
    ExchangeRates::RateSet.new(
      provider: "ECB", base: "EUR", rate_date:, fetched_at: Time.current,
      rates: rates.to_h { |currency, rate| [ currency, BigDecimal(rate.to_s) ] }.sort.to_h
    )
  end

  def create_insight_employee(name, country:, department:, job_title:, salaries:, employment_type: "full_time",
                              hire_date: Date.new(2020, 1, 1))
    employee = Employee.create!(
      first_name: name, last_name: "Test", email: "#{name.downcase}@acme.example", job_title:, department:,
      country_code: country, employment_type:, hire_date:
    )
    salaries.each do |effective_on, salary, currency|
      EmployeeSalary.create!(employee:, effective_on:, salary:, currency:)
    end
    employee
  end

  # Current monthly costs in INR: Engineering 9,00,000 (12,00,000 + 96,00,000
  # a year), Sales 8,75,000 (60,00,000 + 45,00,000 a year); 17,75,000 in total.
  # Ignored: Ira's superseded and pending records, and Kai, whose only salary
  # starts in the future.
  def create_insight_fixture
    create_insight_employee("Ira", country: "IN", department: "Engineering", job_title: "Software Engineer",
      salaries: [ [ Date.new(2020, 1, 1), 1_000_000, "INR" ], [ Date.new(2023, 1, 1), 1_200_000, "INR" ],
                  [ Date.current + 30, 2_000_000, "INR" ] ])
    create_insight_employee("Uma", country: "US", department: "Engineering", job_title: "Software Engineer",
      employment_type: "contract", salaries: [ [ Date.new(2021, 1, 1), 120_000, "USD" ] ])
    create_insight_employee("Dev", country: "DE", department: "Sales", job_title: "Account Executive",
      salaries: [ [ Date.new(2021, 1, 1), 60_000, "EUR" ] ])
    create_insight_employee("Jun", country: "JP", department: "Sales", job_title: "Account Executive",
      employment_type: "part_time", salaries: [ [ Date.new(2021, 1, 1), 7_200_000, "JPY" ] ])
    create_insight_employee("Kai", country: "IN", department: "Sales", job_title: "Account Executive",
      hire_date: Date.current, salaries: [ [ Date.current + 10, 900_000, "INR" ] ])
  end

  def frankfurter_rows(date: "2026-10-23", overrides: {})
    { "GBP" => 0.83728, "INR" => 106.272, "JPY" => 175.51, "SGD" => 1.431, "USD" => 1.1193 }.merge(overrides)
      .map { |quote, rate| { "date" => date, "base" => "EUR", "quote" => quote, "rate" => rate } }
  end

  def stub_frankfurter(body: frankfurter_rows, status: 200)
    stub_request(:get, "https://api.frankfurter.dev/v2/rates")
      .with(query: { base: "EUR", quotes: "USD,GBP,INR,JPY,SGD", providers: "ECB" })
      .to_return(status:, body: body.is_a?(String) ? body : body.to_json, headers: { "Content-Type" => "application/json" })
  end
end

RSpec.configure do |config|
  config.include InsightsHelpers
end
