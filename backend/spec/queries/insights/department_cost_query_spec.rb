require "rails_helper"

RSpec.describe Insights::DepartmentCostQuery do
  let(:rate_set) { build_rate_set }

  before { create_insight_fixture }

  def report(filters = {}, currency: "INR", rate_set: self.rate_set)
    described_class.new(currency:, rate_set:, filters:).call
  end

  it "sums converted monthly cost per department, largest first, with each share" do
    expect(report.rows).to eq([
      { department: "Engineering", headcount: 2, without_current_salary: 0,
        monthly_cost: BigDecimal("900000"), share_percent: BigDecimal("50.7") },
      { department: "Sales", headcount: 3, without_current_salary: 1,
        monthly_cost: BigDecimal("875000"), share_percent: BigDecimal("49.3") }
    ])
  end

  it "filters by country and employment type" do
    expect(report({ employment_type: "contract" }).rows.map { |row| row.values_at(:department, :monthly_cost) })
      .to eq([ [ "Engineering", BigDecimal("800000") ] ])
    expect(report({ country_code: "IN" }).rows.map { |row| row.values_at(:department, :headcount, :monthly_cost) })
      .to eq([ [ "Engineering", 1, BigDecimal("100000") ], [ "Sales", 1, BigDecimal("0") ] ])
  end

  it "ignores a department filter, because departments are what it groups by" do
    expect(report({ department: "Sales" }).rows.size).to eq(2)
  end

  it "returns original-currency costs per department and no converted figures without rates" do
    result = report(rate_set: nil)

    expect(result.conversion.status).to eq("unavailable")
    expect(result.rows.map { |row| row.values_at(:department, :headcount, :monthly_cost) })
      .to contain_exactly([ "Engineering", 2, nil ], [ "Sales", 3, nil ])
    expect(result.by_currency).to eq([
      { department: "Engineering", currency: "INR", monthly_cost_original: BigDecimal("100000") },
      { department: "Engineering", currency: "USD", monthly_cost_original: BigDecimal("10000") },
      { department: "Sales", currency: "EUR", monthly_cost_original: BigDecimal("5000") },
      { department: "Sales", currency: "JPY", monthly_cost_original: BigDecimal("600000") }
    ])
  end

  it "needs no rates when every salary in the filtered set is already in the display currency" do
    result = report({ country_code: "IN" }, rate_set: nil)

    expect(result.conversion.status).to eq("not_needed")
    expect(result.rows.first[:monthly_cost]).to eq(BigDecimal("100000"))
  end
end
