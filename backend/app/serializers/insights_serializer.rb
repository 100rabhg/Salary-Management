# Insight reports as JSON. Amounts are two-decimal strings like the rest of
# the API; converted figures are null when rates are unavailable.
module InsightsSerializer
  module_function

  def summary(result)
    {
      headcount: result.headcount,
      without_current_salary: result.without_current_salary,
      annual_cost: amount(result.annual_cost),
      monthly_cost: amount(result.monthly_cost),
      by_currency: result.by_currency.map do |row|
        row.merge(
          annual_cost_original: amount(row[:annual_cost_original]),
          monthly_cost_original: amount(row[:monthly_cost_original]),
          rate: row[:rate]&.to_s("F"),
          monthly_cost: amount(row[:monthly_cost])
        )
      end,
      conversion: conversion(result.conversion)
    }
  end

  def department_costs(result)
    {
      data: result.rows.map do |row|
        row.merge(monthly_cost: amount(row[:monthly_cost]), share_percent: row[:share_percent]&.to_f)
      end,
      by_currency: result.by_currency.map { |row| row.merge(monthly_cost_original: amount(row[:monthly_cost_original])) },
      conversion: conversion(result.conversion)
    }
  end

  def salary_ranges(result, key:)
    {
      data: result.rows.map do |row|
        label = key == :country_code ? { country_name: Country.name_for(row[:key]) } : {}
        { key => row[:key], **label, headcount: row[:headcount],
          **Insights::SalaryRangeQuery::STATS.to_h { |stat| [ stat, amount(row[stat]) ] } }
      end,
      conversion: conversion(result.conversion)
    }
  end

  def conversion(conversion)
    rate_set = conversion.rate_set
    {
      display_currency: conversion.display_currency,
      status: conversion.status,
      rates_token: rate_set&.token,
      provider: rate_set&.provider,
      rate_date: rate_set&.rate_date,
      fetched_at: rate_set&.fetched_at,
      rates: conversion.rates_used.transform_values { |rate| rate.to_s("F") }
    }
  end

  def amount(value)
    SalaryAmount.format(value)
  end
end
