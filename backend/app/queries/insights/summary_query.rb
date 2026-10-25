module Insights
  # Dashboard figures for all employees: headcount, estimated monthly and
  # annual cost in the display currency, and the same costs per original
  # salary currency. Monthly cost is the annual sum divided by 12, rounded once.
  class SummaryQuery < Report
    Result = Data.define(:headcount, :without_current_salary, :annual_cost, :monthly_cost, :by_currency, :conversion)

    def call
      totals = select_all(<<~SQL.squish).first
        WITH #{current_salaries_cte}, #{conversion.rates_cte}
        SELECT COUNT(*) AS headcount,
          COUNT(*) FILTER (WHERE cur.employee_id IS NULL) AS without_current_salary,
          ROUND(SUM(#{conversion.converted_sql}), #{conversion.scale}) AS annual_cost,
          ROUND(SUM(#{conversion.converted_sql}) / 12, #{conversion.scale}) AS monthly_cost
        FROM employees e
        LEFT JOIN cur ON cur.employee_id = e.id
        LEFT JOIN rates ON rates.currency = cur.currency
      SQL

      Result.new(
        headcount: totals["headcount"].to_i,
        without_current_salary: totals["without_current_salary"].to_i,
        annual_cost: converted(totals["annual_cost"]),
        monthly_cost: converted(totals["monthly_cost"]),
        by_currency:,
        conversion:
      )
    end

    private

    def by_currency
      rates = conversion.rates_used
      select_all(<<~SQL.squish).map do |row|
        WITH #{current_salaries_cte}, #{conversion.rates_cte}
        SELECT cur.currency, COUNT(*) AS headcount,
          ROUND(SUM(cur.salary), #{original_scale_sql}) AS annual_cost_original,
          ROUND(SUM(cur.salary) / 12, #{original_scale_sql}) AS monthly_cost_original,
          ROUND(SUM(#{conversion.converted_sql}) / 12, #{conversion.scale}) AS monthly_cost
        FROM employees e
        JOIN cur ON cur.employee_id = e.id
        JOIN rates ON rates.currency = cur.currency
        GROUP BY cur.currency
        ORDER BY SUM(#{conversion.converted_sql}) DESC, cur.currency
      SQL
        {
          currency: row["currency"],
          headcount: row["headcount"].to_i,
          annual_cost_original: decimal(row["annual_cost_original"]),
          monthly_cost_original: decimal(row["monthly_cost_original"]),
          rate: rates[row["currency"]],
          monthly_cost: conversion.available? ? decimal(row["monthly_cost"]) : nil
        }
      end
    end

    # No salaries at all sums to NULL; that is a cost of zero, not "unknown".
    def converted(value)
      conversion.available? ? decimal(value) || BigDecimal("0") : nil
    end
  end
end
