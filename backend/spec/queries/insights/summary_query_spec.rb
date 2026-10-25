require "rails_helper"

RSpec.describe Insights::SummaryQuery do
  let(:rate_set) { build_rate_set }

  before { create_insight_fixture }

  def summary(currency: "INR", rate_set: self.rate_set) = described_class.new(currency:, rate_set:).call

  it "counts every employee and costs only current salaries, converted to INR before adding" do
    result = summary

    expect(result).to have_attributes(
      headcount: 5, without_current_salary: 1,
      annual_cost: BigDecimal("21300000"), monthly_cost: BigDecimal("1775000")
    )
    expect(result.conversion.status).to eq("current")
  end

  it "gives the same figures in USD and JPY (whole yen)" do
    expect(summary(currency: "USD")).to have_attributes(annual_cost: BigDecimal("266250"), monthly_cost: BigDecimal("22187.5"))
    expect(summary(currency: "JPY")).to have_attributes(annual_cost: BigDecimal("34080000"), monthly_cost: BigDecimal("2840000"))
  end

  it "breaks the cost down by original currency with the rate used" do
    rows = summary.by_currency.index_by { |row| row[:currency] }

    expect(rows.keys).to eq(%w[USD EUR JPY INR]) # largest converted cost first
    expect(rows["USD"]).to include(headcount: 1, annual_cost_original: BigDecimal("120000"),
      monthly_cost_original: BigDecimal("10000"), rate: BigDecimal("80"), monthly_cost: BigDecimal("800000"))
    expect(rows["JPY"]).to include(monthly_cost_original: BigDecimal("600000"), rate: BigDecimal("0.625"),
      monthly_cost: BigDecimal("375000"))
    expect(rows["INR"]).to include(headcount: 1, rate: BigDecimal("1"), monthly_cost: BigDecimal("100000"))
  end

  it "never changes the stored salary records" do
    expect { summary(currency: "JPY") }.not_to(change { EmployeeSalary.order(:id).pluck(:salary, :currency, :updated_at) })
  end

  it "keeps headcount and original-currency figures when there are no rates" do
    result = summary(rate_set: nil)

    expect(result).to have_attributes(headcount: 5, without_current_salary: 1, annual_cost: nil, monthly_cost: nil)
    expect(result.conversion.status).to eq("unavailable")
    expect(result.by_currency.find { |row| row[:currency] == "USD" })
      .to include(monthly_cost_original: BigDecimal("10000"), rate: nil, monthly_cost: nil)
  end

  it "marks rates older than four days as stale but still uses them" do
    expect(summary(rate_set: build_rate_set(rate_date: Date.current - 4)).conversion.status).to eq("current")

    stale = summary(rate_set: build_rate_set(rate_date: Date.current - 5))
    expect(stale.conversion.status).to eq("stale")
    expect(stale.monthly_cost).to eq(BigDecimal("1775000"))
  end
end

RSpec.describe Insights::SummaryQuery, "rounding" do
  it "rounds once at the end, half away from zero, to the display currency's minor unit" do
    # Annual 6 yen -> monthly 0.5 yen; float rounding (half to even) would give 0.
    create_insight_employee("Yuki", country: "JP", department: "Sales", job_title: "Account Executive",
      salaries: [ [ Date.new(2021, 1, 1), 6, "JPY" ] ])

    result = described_class.new(currency: "JPY", rate_set: nil).call

    expect(result.monthly_cost).to eq(BigDecimal("1"))
    expect(result.conversion.status).to eq("not_needed")
  end

  it "rounds converted JPY figures to whole yen" do
    # 1,000,001 INR * 1.6 = 1,600,001.6 JPY a year; 133,333.47 a month.
    create_insight_employee("Ravi", country: "IN", department: "Sales", job_title: "Account Executive",
      salaries: [ [ Date.new(2021, 1, 1), 1_000_001, "INR" ] ])

    result = described_class.new(currency: "JPY", rate_set: build_rate_set).call

    expect(result).to have_attributes(annual_cost: BigDecimal("1600002"), monthly_cost: BigDecimal("133333"))
  end
end
