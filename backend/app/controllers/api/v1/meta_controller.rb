module Api
  module V1
    # Reference data for the UI: today's business date, the supported
    # countries and currencies, and the values used in filters and forms.
    class MetaController < BaseController
      def show
        render json: {
          today: Date.current,
          time_zone: Time.zone.tzinfo.name,
          default_currency: Country::DEFAULT_CURRENCY,
          countries: Country::ALL.map { |code, country| { code:, name: country[:name], currency: country[:currency] } },
          currencies: Country::CURRENCIES.map { |code| { code:, zero_decimal: Country.zero_decimal?(code) } },
          employment_types: Employee.employment_types.keys,
          departments: Employee.distinct.order(:department).pluck(:department),
          job_titles: Employee.distinct.order(:job_title).pluck(:job_title)
        }
      end
    end
  end
end
