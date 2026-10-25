module Api
  module V1
    # The rate set a page pins for all its reports. This is the only endpoint
    # that may refresh rates (see ExchangeRates::Current).
    class ExchangeRatesController < BaseController
      def current
        rate_set = ExchangeRates::Current.call
        status = if rate_set.nil? then "unavailable"
        elsif rate_set.stale? then "stale"
        else "current"
        end

        render json: { rate_set: rate_set && RateSetSerializer.call(rate_set), status: }
      end
    end
  end
end
