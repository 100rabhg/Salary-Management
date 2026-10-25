require "digest"

module ExchangeRates
  # One complete, validated set of ECB reference rates for one date, with
  # EUR as the base: units of each supported currency per 1 EUR (EUR = 1).
  #
  # `token` is an opaque version of the set, a digest of its provider, base,
  # date and rates. Reports are pinned to it, so every report on a page uses
  # the same rates; identical data gives the same token in every process.
  RateSet = Data.define(:provider, :base, :rate_date, :fetched_at, :rates) do
    def self.provider = "ECB"
    def self.base = "EUR"

    # ECB doesn't publish at weekends or on TARGET holidays, so rates up to
    # this many days old are normal.
    def self.stale_after_days = 4

    # Rebuilds a set from the plain hash kept in the cache.
    def self.from_h(hash)
      new(**hash.symbolize_keys.slice(*members))
    end

    def token
      rate_list = rates.sort.map { |currency, rate| "#{currency}=#{rate.to_s('F')}" }.join(",")
      "r_#{Digest::SHA256.hexdigest([ provider, base, rate_date.iso8601, rate_list ].join('|'))[0, 16]}"
    end

    def stale?(today = Date.current)
      rate_date < today - self.class.stale_after_days
    end
  end
end
