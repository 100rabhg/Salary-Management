module ExchangeRates
  # Keeps validated rate sets in Rails.cache (an in-process memory store; no
  # Redis, no database table). Each set is stored whole, as one value, under
  # its token, and the latest set's token is kept separately, so a pinned
  # token keeps resolving after a newer set arrives.
  #
  # The memory store is empty after a restart and separate in each Puma
  # worker. Until the first successful fetch there are no rates, and a token
  # pinned before a restart is no longer known (callers re-pin; see
  # Api::V1::InsightsController).
  module Store
    PREFIX = "exchange_rates/v1"
    FAILURE_BACKOFF = 5.minutes

    module_function

    def latest
      token = cache.read("#{PREFIX}/latest")
      token && find(token)
    end

    def find(token)
      hash = cache.read("#{PREFIX}/sets/#{token}")
      hash && RateSet.from_h(hash)
    end

    # Stores a set and makes it the latest. Returns true if it wasn't
    # already the latest set.
    def write(rate_set, now: Time.current)
      changed = cache.read("#{PREFIX}/latest") != rate_set.token
      cache.write("#{PREFIX}/sets/#{rate_set.token}", rate_set.to_h)
      cache.write("#{PREFIX}/latest", rate_set.token)
      mark_checked(now)
      changed
    end

    def last_checked_at
      cache.read("#{PREFIX}/checked_at")
    end

    def mark_checked(now = Time.current)
      cache.write("#{PREFIX}/checked_at", now)
    end

    def backing_off?
      cache.exist?("#{PREFIX}/failed")
    end

    def record_failure
      cache.write("#{PREFIX}/failed", true, expires_in: FAILURE_BACKOFF)
    end

    def clear_failure
      cache.delete("#{PREFIX}/failed")
    end

    def cache
      Rails.cache
    end
  end
end
