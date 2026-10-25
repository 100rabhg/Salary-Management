module ExchangeRates
  # Returns the rate set reports should pin: the latest cached one, refreshed
  # first if it was last checked more than EXCHANGE_RATES_REFRESH_HOURS ago
  # or if nothing is cached (as after a restart).
  #
  # Only one thread per process refreshes at a time; threads that don't get
  # the lock use the cached set instead of waiting. After a failed refresh
  # the process waits Store::FAILURE_BACKOFF before trying again, so a
  # provider outage costs at most one slow request every few minutes.
  class Current
    @refresh_lock = Mutex.new

    class << self
      def call(refresh: Refresh.new, now: Time.current)
        rate_set = Store.latest
        return rate_set unless refresh_due?(rate_set, now) && !Store.backing_off?
        return rate_set unless @refresh_lock.try_lock

        begin
          result = refresh.call
          result.ok? ? Store.clear_failure : Store.record_failure
        ensure
          @refresh_lock.unlock
        end
        Store.latest
      end

      def refresh_hours
        Integer(ENV.fetch("EXCHANGE_RATES_REFRESH_HOURS", "6"))
      end

      private

      def refresh_due?(rate_set, now)
        checked_at = Store.last_checked_at
        rate_set.nil? || checked_at.nil? || checked_at < now - refresh_hours.hours
      end
    end
  end
end
