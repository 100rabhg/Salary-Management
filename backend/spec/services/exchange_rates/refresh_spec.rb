require "rails_helper"

RSpec.describe ExchangeRates::Refresh do
  let(:today) { Date.new(2026, 10, 25) } # a Sunday; ECB's latest is Friday 23 Oct

  def refresh = described_class.new(today:).call

  it "asks Frankfurter for ECB rates and caches one complete EUR-based set" do
    request = stub_frankfurter

    result = refresh

    expect(request).to have_been_requested.once
    expect(result.status).to eq(:created)
    cached = ExchangeRates::Store.latest
    expect(cached).to eq(result.rate_set)
    expect(cached).to have_attributes(provider: "ECB", base: "EUR", rate_date: Date.new(2026, 10, 23))
    expect(cached.rates).to eq(
      "EUR" => BigDecimal("1"), "GBP" => BigDecimal("0.83728"), "INR" => BigDecimal("106.272"),
      "JPY" => BigDecimal("175.51"), "SGD" => BigDecimal("1.431"), "USD" => BigDecimal("1.1193")
    )
    expect(cached.token).to match(/\Ar_[0-9a-f]{16}\z/)
  end

  it "only records the check when the same set is already cached" do
    stub_frankfurter
    first = refresh.rate_set
    travel 2.hours

    result = refresh

    expect(result.status).to eq(:unchanged)
    expect(result.rate_set.token).to eq(first.token)
    expect(ExchangeRates::Store.last_checked_at).to be_within(5.seconds).of(Time.current)
  end

  it "keeps earlier sets resolvable by token after a newer one arrives" do
    older = cache_rate_set(rate_date: Date.new(2026, 10, 22))
    stub_frankfurter

    newer = refresh.rate_set

    expect(newer.token).not_to eq(older.token)
    expect(ExchangeRates::Store.latest).to eq(newer)
    expect(ExchangeRates::Store.find(older.token)).to eq(older)
  end

  {
    "a missing currency" => -> { frankfurter_rows.reject { |row| row["quote"] == "JPY" } },
    "a duplicated currency" => -> { frankfurter_rows + [ frankfurter_rows.first ] },
    "an unsupported extra currency" => -> { frankfurter_rows + [ { "date" => "2026-10-23", "base" => "EUR", "quote" => "AUD", "rate" => 1.7 } ] },
    "a base other than EUR" => -> { frankfurter_rows.map { |row| row.merge("base" => "USD") } },
    "mixed dates" => -> { frankfurter_rows.each_with_index.map { |row, i| i.zero? ? row.merge("date" => "2026-10-22") : row } },
    "a future date" => -> { frankfurter_rows(date: "2026-10-26") },
    "a weekend date (not an ECB rate)" => -> { frankfurter_rows(date: "2026-10-24") },
    "an unparseable date" => -> { frankfurter_rows(date: "23/10/2026") },
    "a zero rate" => -> { frankfurter_rows(overrides: { "INR" => 0 }) },
    "a negative rate" => -> { frankfurter_rows(overrides: { "USD" => -1.1 }) },
    "a rate that is a string" => -> { frankfurter_rows(overrides: { "USD" => "1.1" }) },
    "an object instead of a list" => -> { { "rates" => {} } }
  }.each do |problem, body|
    it "rejects a response with #{problem} and keeps the last good set" do
      previous = cache_rate_set(rate_date: Date.new(2026, 10, 22))
      stub_frankfurter(body: instance_exec(&body))

      result = refresh

      expect(result.status).to eq(:failed)
      expect(result.error).to start_with("invalid Frankfurter response")
      expect(ExchangeRates::Store.latest).to eq(previous)
    end
  end

  it "fails cleanly on an HTTP error, invalid JSON or a timeout" do
    stub_frankfurter(status: 503, body: "{}")
    expect(refresh).to have_attributes(status: :failed, error: "Frankfurter returned HTTP 503")

    stub_frankfurter(body: "not json")
    expect(refresh.error).to start_with("Frankfurter request failed: JSON::ParserError")

    stub_request(:get, /frankfurter/).to_timeout
    expect(refresh.error).to start_with("Frankfurter request failed")
    expect(ExchangeRates::Store.latest).to be_nil
  end

  it "gives the same token to the same rates, whatever the fetch time" do
    expect(build_rate_set.token).to eq(build_rate_set.token)
    expect(build_rate_set(rates: InsightsHelpers::FIXTURE_RATES.merge("USD" => "1.26")).token).not_to eq(build_rate_set.token)
  end
end
