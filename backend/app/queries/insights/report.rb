module Insights
  # Shared base for the insight reports: the current-salary set, the report's
  # own filters, and the currency conversion.
  #
  # A current salary is the employee's latest salary period effective on or
  # before today; pending and superseded periods never count. "Today" is
  # passed in as a value, never CURRENT_DATE, so it follows the business
  # time zone.
  class Report
    # Filters a report accepts; a report never filters on what it groups by.
    FILTERS = [].freeze

    def initialize(currency:, rate_set:, filters: {}, today: Date.current)
      @currency = currency
      @rate_set = rate_set
      @today = today
      @filters = filters.to_h.symbolize_keys.slice(*allowed_filters).compact_blank
    end

    def conversion
      @conversion ||= Conversion.new(
        display_currency: @currency, rate_set: @rate_set, currencies: currencies_present, today: @today
      )
    end

    private

    def allowed_filters
      self.class::FILTERS
    end

    def current_salaries_cte
      <<~SQL.squish
        cur AS (
          SELECT DISTINCT ON (employee_id) employee_id, salary, currency
          FROM employee_salaries
          WHERE effective_on <= #{quote(@today)}
          ORDER BY employee_id, effective_on DESC
        )
      SQL
    end

    def where_clause
      return "" if @filters.empty?

      conditions = @filters.map do |column, value|
        ApplicationRecord.sanitize_sql_array([ "e.#{column} = ?", value ])
      end
      "WHERE #{conditions.join(' AND ')}"
    end

    def currencies_present
      connection.select_values(<<~SQL.squish)
        WITH #{current_salaries_cte}
        SELECT DISTINCT cur.currency FROM employees e JOIN cur ON cur.employee_id = e.id #{where_clause}
      SQL
    end

    # Rounds to the original currency's minor unit (0 for JPY, otherwise 2).
    def original_scale_sql(currency_column = "cur.currency")
      zero_decimal = Country::ZERO_DECIMAL_CURRENCIES.map { |code| quote(code) }.join(", ")
      "CASE WHEN #{currency_column} IN (#{zero_decimal}) THEN 0 ELSE 2 END"
    end

    def select_all(sql)
      connection.select_all(sql).to_a
    end

    def quote(value)
      connection.quote(value)
    end

    def connection
      ApplicationRecord.connection
    end

    def decimal(value)
      value.nil? ? nil : BigDecimal(value.to_s)
    end
  end
end
