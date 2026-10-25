require "rails_helper"

RSpec.describe Insights::SalaryRangeQuery do
  let(:rate_set) { build_rate_set }

  def ranges(group_by, filters = {}, currency: "INR", rate_set: self.rate_set)
    described_class.new(group_by:, currency:, rate_set:, filters:).call
  end

  def stats(row) = row.slice(:headcount, :min, :p25, :median, :p75, :max, :mean).transform_values { |v| v.is_a?(BigDecimal) ? v.to_s("F") : v }

  context "with the fixture" do
    before { create_insight_fixture }

    it "gives each role's annual range in INR, over employees with a current salary" do
      rows = ranges(:job_title).rows.index_by { |row| row[:key] }

      # Software Engineer: 12,00,000 and 96,00,000 (= $120,000 * 80).
      expect(stats(rows["Software Engineer"])).to eq(
        headcount: 2, min: "1200000.0", p25: "3300000.0", median: "5400000.0", p75: "7500000.0",
        max: "9600000.0", mean: "5400000.0"
      )
      # Account Executive: 45,00,000 (= ¥7,200,000 * 0.625) and 60,00,000 (= €60,000 * 100); Kai has no current salary.
      expect(stats(rows["Account Executive"])).to eq(
        headcount: 2, min: "4500000.0", p25: "4875000.0", median: "5250000.0", p75: "5625000.0",
        max: "6000000.0", mean: "5250000.0"
      )
    end

    it "filters roles by country, department and employment type" do
      expect(ranges(:job_title, { country_code: "US" }).rows.map { |row| [ row[:key], row[:median] ] })
        .to eq([ [ "Software Engineer", BigDecimal("9600000") ] ])
      expect(ranges(:job_title, { department: "Sales", employment_type: "part_time" }).rows.map { |row| row[:key] })
        .to eq([ "Account Executive" ])
    end

    it "lists every country, ignoring a country filter, and filters by the others" do
      rows = ranges(:country_code, { country_code: "US" }).rows

      expect(rows.size).to eq(8)
      expect(rows.first(4).map { |row| [ row[:key], row[:median] ] }).to eq([
        [ "US", BigDecimal("9600000") ], [ "DE", BigDecimal("6000000") ], [ "JP", BigDecimal("4500000") ], [ "IN", BigDecimal("1200000") ]
      ])
      expect(rows.last(4).map { |row| row.values_at(:key, :headcount, :median) })
        .to eq([ [ "FR", 0, nil ], [ "NL", 0, nil ], [ "SG", 0, nil ], [ "GB", 0, nil ] ])

      expect(ranges(:country_code, { job_title: "Software Engineer" }).rows.select { |row| row[:headcount].positive? }
        .map { |row| row[:key] }).to eq(%w[US IN])
    end

    it "keeps headcounts but no ranges when rates are unavailable" do
      result = ranges(:job_title, rate_set: nil)

      expect(result.conversion.status).to eq("unavailable")
      expect(result.rows.map { |row| row.values_at(:key, :headcount, :median) })
        .to contain_exactly([ "Software Engineer", 2, nil ], [ "Account Executive", 2, nil ])
    end
  end

  it "converts each salary before ranking, so percentiles are not built from per-currency medians" do
    # INR 10, 20, 30 and USD 1 at 1 USD = 100 INR: {10, 20, 30, 100}.
    # Median of the per-currency medians would be (20 + 100) / 2 = 60.
    rate_set = build_rate_set(rates: { "EUR" => 1, "INR" => 100, "USD" => 1, "JPY" => 160, "GBP" => 1, "SGD" => 1 })
    [ [ "Ann", 10, "INR" ], [ "Ben", 20, "INR" ], [ "Cy", 30, "INR" ], [ "Di", 1, "USD" ] ].each do |name, salary, currency|
      create_insight_employee(name, country: "IN", department: "Sales", job_title: "Recruiter",
        salaries: [ [ Date.new(2021, 1, 1), salary, currency ] ])
    end

    row = ranges(:job_title, rate_set:).rows.sole

    expect(stats(row)).to eq(headcount: 4, min: "10.0", p25: "17.5", median: "25.0", p75: "47.5", max: "100.0", mean: "40.0")
  end

  it "interpolates percentiles in numeric at full precision before rounding" do
    # PostgreSQL's percentile_cont returns double precision for numeric input;
    # this report doesn't. Between 1,234,567,890.11 and 1,234,567,890.12 the
    # 25th percentile is exactly ...890.1125 (rounds to .11) and the median
    # exactly ...890.115 (rounds half away from zero to .12).
    [ [ "Ann", "1234567890.11" ], [ "Ben", "1234567890.12" ] ].each do |name, salary|
      create_insight_employee(name, country: "IN", department: "Sales", job_title: "Recruiter",
        salaries: [ [ Date.new(2021, 1, 1), BigDecimal(salary), "INR" ] ])
    end

    row = ranges(:job_title, rate_set: nil).rows.sole

    expect(row.values_at(:p25, :median, :p75)).to eq([ BigDecimal("1234567890.11"), BigDecimal("1234567890.12"), BigDecimal("1234567890.12") ])
  end
end
