module Insights
  # Decides how a report converts salaries into the display currency, using
  # one pinned rate set (EUR-based rates).
  #
  # status:
  # - "not_needed":  every salary in the report is already in the display
  #                  currency, so no rates are used (works with no rate set);
  # - "unavailable": rates are needed but there is no rate set;
  # - "stale" / "current": rates are used; "stale" when the rate set's date
  #                  is older than ExchangeRates::RateSet.stale_after_days.
  #
  # A salary in currency C converts as salary * eur_rate(display) / eur_rate(C),
  # in numeric (multiply first, then divide). The display currency itself
  # converts with factor exactly 1.
  class Conversion
    attr_reader :display_currency, :rate_set, :currencies, :status

    def initialize(display_currency:, rate_set:, currencies:, today: Date.current)
      @display_currency = display_currency
      @rate_set = rate_set
      @currencies = currencies.sort
      needed = (@currencies - [ display_currency ]).any?
      @status =
        if !needed then "not_needed"
        elsif rate_set.nil? then "unavailable"
        elsif rate_set.stale?(today) then "stale"
        else "current"
        end
    end

    def available?
      status != "unavailable"
    end

    def scale
      Country.zero_decimal?(display_currency) ? 0 : 2
    end

    # A CTE named `rates` with (currency, factor_num, factor_den) such that
    # converted = salary * factor_num / factor_den.
    def rates_cte
      rows = Country::CURRENCIES.map do |currency|
        numerator, denominator = factor(currency)
        "(#{quote(currency)}, #{numeric(numerator)}, #{numeric(denominator)})"
      end
      "rates(currency, factor_num, factor_den) AS (VALUES #{rows.join(', ')})"
    end

    def converted_sql(salary_column = "cur.salary")
      "(#{salary_column} * rates.factor_num / rates.factor_den)"
    end

    # How many display-currency units one unit of each currency in the report
    # is worth, for showing alongside the figures.
    def rates_used
      return {} unless available?

      currencies.to_h do |currency|
        numerator, denominator = factor(currency)
        [ currency, (numerator / denominator).round(6) ]
      end
    end

    private

    def factor(currency)
      return [ BigDecimal("1"), BigDecimal("1") ] if currency == display_currency || rate_set.nil?

      [ rate_set.rates.fetch(display_currency), rate_set.rates.fetch(currency) ]
    end

    def quote(value)
      ApplicationRecord.connection.quote(value)
    end

    def numeric(value)
      "#{BigDecimal(value).to_s('F')}::numeric"
    end
  end
end
