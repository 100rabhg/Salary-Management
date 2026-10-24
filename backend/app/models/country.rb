# Supported countries, their usual currencies and the supported salary
# currencies. The single source of truth for validation, seeding and the UI's
# options (served by /api/v1/meta). Adding a country or currency is a code
# change only; there is no matching database constraint.
#
# A country's currency is only the default for new salary records: HR can pay
# an employee in any supported currency (see EmployeeSalary).
module Country
  ALL = {
    "US" => { name: "United States", currency: "USD" },
    "GB" => { name: "United Kingdom", currency: "GBP" },
    "DE" => { name: "Germany", currency: "EUR" },
    "FR" => { name: "France", currency: "EUR" },
    "NL" => { name: "Netherlands", currency: "EUR" },
    "IN" => { name: "India", currency: "INR" },
    "JP" => { name: "Japan", currency: "JPY" },
    "SG" => { name: "Singapore", currency: "SGD" }
  }.freeze

  CURRENCIES = ALL.values.map { |country| country[:currency] }.uniq.freeze

  # Used when a salary record has no currency and the country gives no hint.
  DEFAULT_CURRENCY = "INR"

  # Currencies with no minor unit: amounts must be whole numbers.
  ZERO_DECIMAL_CURRENCIES = %w[JPY].freeze

  def self.codes
    ALL.keys
  end

  def self.name_for(code)
    ALL.dig(code, :name)
  end

  def self.currency_for(code)
    ALL.dig(code, :currency)
  end

  def self.default_currency_for(code)
    currency_for(code) || DEFAULT_CURRENCY
  end

  def self.zero_decimal?(currency)
    ZERO_DECIMAL_CURRENCIES.include?(currency)
  end
end
