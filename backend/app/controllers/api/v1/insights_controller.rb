module Api
  module V1
    # Dashboard and Insights reports. Every report converts with the rate set
    # pinned by rates_token (the latest cached set if none is given) and never
    # refreshes rates, so all reports on a page use the same rates.
    class InsightsController < BaseController
      def summary
        render json: InsightsSerializer.summary(Insights::SummaryQuery.new(**report_options).call)
      end

      def department_costs
        render json: InsightsSerializer.department_costs(Insights::DepartmentCostQuery.new(**report_options).call)
      end

      def role_salary_ranges
        result = Insights::SalaryRangeQuery.new(group_by: :job_title, **report_options).call
        render json: InsightsSerializer.salary_ranges(result, key: :job_title)
      end

      def country_salary_distribution
        result = Insights::SalaryRangeQuery.new(group_by: :country_code, **report_options).call
        render json: InsightsSerializer.salary_ranges(result, key: :country_code)
      end

      private

      def report_options
        {
          currency: display_currency,
          rate_set: pinned_rate_set,
          filters: params.permit(:country_code, :department, :job_title, :employment_type).to_h
        }
      end

      def display_currency
        currency = params[:currency].presence || Country::DEFAULT_CURRENCY
        raise InvalidParameter.new(:currency, "is not a supported currency") unless Country::CURRENCIES.include?(currency)

        currency
      end

      # "none" pins "no rates": a page that loaded without rates keeps all its
      # reports on that, even if rates are cached meanwhile. A token the cache
      # no longer holds (it is emptied on restart) is a 409, so the page can
      # fetch the current rates and pin again.
      def pinned_rate_set
        token = params[:rates_token]
        return ExchangeRates::Store.latest if token.blank?
        return nil if token == "none"

        ExchangeRates::Store.find(token) || raise(UnknownRatesToken)
      end
    end
  end
end
