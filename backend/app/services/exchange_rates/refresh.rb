module ExchangeRates
  # Fetches the latest rates and caches them as one RateSet if, and only if,
  # the response is complete and valid. Fetching the set that is already the
  # latest only records the check. Any failure leaves the cache untouched,
  # so the last good set stays in use.
  class Refresh
    InvalidResponse = Class.new(StandardError)

    Result = Data.define(:status, :rate_set, :error) do
      def ok? = status != :failed
    end

    def initialize(client: FrankfurterClient.new, today: Date.current, logger: Rails.logger)
      @client = client
      @today = today
      @logger = logger
    end

    def call
      rate_date, rates = validate(@client.fetch)
      rate_set = RateSet.new(
        provider: RateSet.provider, base: RateSet.base, rate_date:, fetched_at: Time.current,
        rates: rates.merge(RateSet.base => BigDecimal("1")).sort.to_h
      )
      changed = Store.write(rate_set)
      Result.new(status: changed ? :created : :unchanged, rate_set:, error: nil)
    rescue FrankfurterClient::Error, InvalidResponse => error
      @logger.warn("[exchange_rates] refresh failed: #{error.message}")
      Result.new(status: :failed, rate_set: nil, error: error.message)
    end

    private

    # Accepts only a complete ECB rate set: one row per supported quote
    # currency, all with base EUR and the same date, a date that is neither in
    # the future nor a weekend (ECB never publishes at weekends, so a weekend
    # date means another provider's data), and finite positive rates.
    def validate(rows)
      invalid!("expected a list of rates") unless rows.is_a?(Array) && rows.all?(Hash)

      quotes = rows.map { |row| row["quote"] }
      unless quotes.sort == FrankfurterClient::QUOTES.sort
        invalid!("expected one rate each for #{FrankfurterClient::QUOTES.join(', ')}, got #{quotes.inspect}")
      end
      invalid!("expected base #{RateSet.base}") unless rows.all? { |row| row["base"] == RateSet.base }

      dates = rows.map { |row| row["date"] }.uniq
      invalid!("expected one date, got #{dates.inspect}") unless dates.one?
      rate_date = parse_date(dates.first)
      invalid!("rate date #{rate_date} is in the future") if rate_date > @today
      invalid!("rate date #{rate_date} is a weekend, so not an ECB rate") if rate_date.saturday? || rate_date.sunday?

      rates = rows.to_h { |row| [ row["quote"], parse_rate(row["rate"], row["quote"]) ] }
      [ rate_date, rates ]
    end

    def parse_date(value)
      Date.iso8601(value.to_s)
    rescue Date::Error
      invalid!("invalid rate date #{value.inspect}")
    end

    def parse_rate(value, currency)
      invalid!("rate for #{currency} is not a number") unless value.is_a?(Numeric)
      rate = BigDecimal(value.to_s)
      invalid!("rate for #{currency} must be finite and positive") unless rate.finite? && rate.positive?
      rate
    end

    def invalid!(message)
      raise InvalidResponse, "invalid Frankfurter response: #{message}"
    end
  end
end
