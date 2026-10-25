module Insights
  # Reports 2 and 3: the annual salary range per job title or per country, in
  # the display currency: minimum, 25th percentile, median, 75th percentile,
  # maximum and mean, over employees with a current salary.
  #
  # Percentiles use the same definition as PostgreSQL's percentile_cont
  # (linear interpolation between the two nearest ranks) but are computed in
  # numeric: percentile_cont casts numeric input to double precision. Values
  # are numbered 0..n-1 within each group; for fraction p the position is
  # h = p * (n - 1) and the result is v[floor(h)] + (h - floor(h)) *
  # (v[ceil(h)] - v[floor(h)]). Each salary is converted before ranking.
  class SalaryRangeQuery < Report
    GROUPS = {
      job_title: { column: "job_title", filters: %i[country_code department employment_type] },
      country_code: { column: "country_code", filters: %i[department job_title employment_type] }
    }.freeze
    PERCENTILES = { p25: "0.25", median: "0.5", p75: "0.75" }.freeze
    STATS = %i[min p25 median p75 max mean].freeze

    Result = Data.define(:rows, :conversion)

    def initialize(group_by:, **options)
      @group = GROUPS.fetch(group_by.to_sym)
      @group_by = group_by.to_sym
      super(**options)
    end

    def call
      rows = conversion.available? ? ranges : headcounts
      rows = with_every_country(rows) if @group_by == :country_code
      Result.new(rows:, conversion:)
    end

    private

    # The filters depend on the grouping, so they aren't a class constant.
    def allowed_filters
      @group[:filters]
    end

    def ranges
      percentile_bounds = PERCENTILES.map do |name, p|
        <<~SQL.squish
          MIN(v) FILTER (WHERE rn = FLOOR((n - 1) * #{p})) AS #{name}_lo,
          MIN(v) FILTER (WHERE rn = CEIL((n - 1) * #{p})) AS #{name}_hi
        SQL
      end
      percentiles = PERCENTILES.map do |name, p|
        position = "((n - 1) * #{p})"
        "ROUND(#{name}_lo + (#{position} - FLOOR(#{position})) * (#{name}_hi - #{name}_lo), #{scale}) AS #{name}"
      end

      select_all(<<~SQL.squish).map { |row| range_row(row) }
        WITH #{current_salaries_cte}, #{conversion.rates_cte},
        converted AS (
          SELECT e.#{@group[:column]} AS key, #{conversion.converted_sql} AS v
          FROM employees e
          JOIN cur ON cur.employee_id = e.id
          JOIN rates ON rates.currency = cur.currency
          #{where_clause}
        ),
        ranked AS (
          SELECT key, v,
            ROW_NUMBER() OVER (PARTITION BY key ORDER BY v) - 1 AS rn,
            COUNT(*) OVER (PARTITION BY key) AS n
          FROM converted
        ),
        bounds AS (
          SELECT key, MAX(n) AS n, MIN(v) AS min_v, MAX(v) AS max_v, AVG(v) AS mean_v,
            #{percentile_bounds.join(', ')}
          FROM ranked
          GROUP BY key
        )
        SELECT key, n AS headcount,
          ROUND(min_v, #{scale}) AS min, ROUND(max_v, #{scale}) AS max, ROUND(mean_v, #{scale}) AS mean,
          #{percentiles.join(', ')}
        FROM bounds
        ORDER BY median DESC, key
      SQL
    end

    def headcounts
      select_all(<<~SQL.squish).map { |row| { key: row["key"], headcount: row["headcount"].to_i, **STATS.index_with(nil) } }
        WITH #{current_salaries_cte}
        SELECT e.#{@group[:column]} AS key, COUNT(*) AS headcount
        FROM employees e
        JOIN cur ON cur.employee_id = e.id
        #{where_clause}
        GROUP BY key
        ORDER BY headcount DESC, key
      SQL
    end

    def range_row(row)
      { key: row["key"], headcount: row["headcount"].to_i, **STATS.to_h { |stat| [ stat, decimal(row[stat.to_s]) ] } }
    end

    # The country report always lists every supported country, so countries
    # with no matching employees show as empty rather than disappearing.
    def with_every_country(rows)
      present = rows.map { |row| row[:key] }
      missing = (Country.codes - present).sort_by { |code| Country.name_for(code) }
      rows + missing.map { |code| { key: code, headcount: 0, **STATS.index_with(nil) } }
    end

    def scale
      conversion.scale
    end
  end
end
