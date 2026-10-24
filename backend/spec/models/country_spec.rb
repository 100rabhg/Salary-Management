require "rails_helper"

RSpec.describe Country do
  it "lists the supported country codes" do
    expect(described_class.codes).to eq(%w[US GB DE FR NL IN JP SG])
  end

  it "returns the currency for a country" do
    expect(described_class.currency_for("JP")).to eq("JPY")
    expect(described_class.currency_for("NL")).to eq("EUR")
  end

  it "returns nil for an unsupported country" do
    expect(described_class.currency_for("BR")).to be_nil
  end

  it "identifies currencies with no minor unit" do
    expect(described_class.zero_decimal?("JPY")).to be(true)
    expect(described_class.zero_decimal?("USD")).to be(false)
  end

  it "lists each supported currency once" do
    expect(described_class::CURRENCIES).to eq(%w[USD GBP EUR INR JPY SGD])
  end

  it "defaults a salary currency to the country's currency, or INR" do
    expect(described_class.default_currency_for("IN")).to eq("INR")
    expect(described_class.default_currency_for("DE")).to eq("EUR")
    expect(described_class.default_currency_for(nil)).to eq("INR")
  end

  it "returns the country name" do
    expect(described_class.name_for("GB")).to eq("United Kingdom")
  end
end
