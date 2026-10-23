# Supported countries and their currencies. The single source of truth for
# validation, seeding and (later) the UI's country options. Adding a country
# is a code change only; there is no matching database constraint.
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

  # Currencies with no minor unit: amounts must be whole numbers.
  ZERO_DECIMAL_CURRENCIES = %w[JPY].freeze

  def self.codes
    ALL.keys
  end

  def self.currency_for(code)
    ALL.dig(code, :currency)
  end

  def self.zero_decimal?(currency)
    ZERO_DECIMAL_CURRENCIES.include?(currency)
  end
end
