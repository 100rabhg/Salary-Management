module RateSetSerializer
  def self.call(rate_set)
    {
      token: rate_set.token,
      provider: rate_set.provider,
      base: rate_set.base,
      rate_date: rate_set.rate_date,
      fetched_at: rate_set.fetched_at,
      rates: rate_set.rates.sort.to_h { |currency, rate| [ currency, rate.to_s("F") ] }
    }
  end
end
