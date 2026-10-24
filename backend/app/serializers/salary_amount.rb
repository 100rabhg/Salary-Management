# Amounts are serialized as strings with two decimals ("72000.00") so no
# client parses money into a binary float by accident.
module SalaryAmount
  def self.format(value)
    return nil if value.nil?

    whole, fraction = BigDecimal(value.to_s).round(2).to_s("F").split(".")
    "#{whole}.#{fraction.to_s.ljust(2, '0')}"
  end
end
