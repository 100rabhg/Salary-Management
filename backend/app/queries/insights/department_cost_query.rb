module Insights
  # Report 1: estimated monthly cost per department in the display currency,
  # with each department's share of the total, plus the monthly cost per
  # department and original currency (shown when rates are unavailable).
  class DepartmentCostQuery < Report
    FILTERS = %i[country_code employment_type].freeze

    Result = Data.define(:rows, :by_currency, :conversion)

    def call
      Result.new(rows:, by_currency:, conversion:)
    end

    private

    def rows
      converted = conversion.converted_sql
      select_all(<<~SQL.squish).map do |row|
        WITH #{current_salaries_cte}, #{conversion.rates_cte}
        SELECT e.department, COUNT(*) AS headcount,
          COUNT(*) FILTER (WHERE cur.employee_id IS NULL) AS without_current_salary,
          ROUND(SUM(#{converted}) / 12, #{conversion.scale}) AS monthly_cost,
          ROUND(100 * SUM(#{converted}) / NULLIF(SUM(SUM(#{converted})) OVER (), 0), 1) AS share_percent
        FROM employees e
        LEFT JOIN cur ON cur.employee_id = e.id
        LEFT JOIN rates ON rates.currency = cur.currency
        #{where_clause}
        GROUP BY e.department
        ORDER BY SUM(#{converted}) DESC NULLS LAST, e.department
      SQL
        {
          department: row["department"],
          headcount: row["headcount"].to_i,
          without_current_salary: row["without_current_salary"].to_i,
          monthly_cost: conversion.available? ? decimal(row["monthly_cost"]) || BigDecimal("0") : nil,
          share_percent: conversion.available? ? decimal(row["share_percent"]) : nil
        }
      end
    end

    def by_currency
      select_all(<<~SQL.squish).map do |row|
        WITH #{current_salaries_cte}
        SELECT e.department, cur.currency,
          ROUND(SUM(cur.salary) / 12, #{original_scale_sql}) AS monthly_cost_original
        FROM employees e
        JOIN cur ON cur.employee_id = e.id
        #{where_clause}
        GROUP BY e.department, cur.currency
        ORDER BY e.department, cur.currency
      SQL
        { department: row["department"], currency: row["currency"], monthly_cost_original: decimal(row["monthly_cost_original"]) }
      end
    end
  end
end
