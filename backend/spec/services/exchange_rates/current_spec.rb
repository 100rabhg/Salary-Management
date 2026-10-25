require "rails_helper"

RSpec.describe ExchangeRates::Current do
  let(:now) { Time.zone.parse("2026-10-25 12:00") }

  around { |example| travel_to(now) { example.run } }

  it "returns the cached set without calling the provider while it is fresh" do
    cached = cache_rate_set(checked_at: now - 5.hours)

    expect(described_class.call).to eq(cached)
    expect(a_request(:get, /frankfurter/)).not_to have_been_made
  end

  it "refreshes a set that was last checked more than the refresh interval ago" do
    cache_rate_set(rate_date: Date.new(2026, 10, 22), checked_at: now - 7.hours)
    stub_frankfurter

    expect(described_class.call.rate_date).to eq(Date.new(2026, 10, 23))
  end

  it "fetches again when the cache is empty, as after a restart" do
    stub_frankfurter
    cache_rate_set
    Rails.cache.clear

    expect(described_class.call.rate_date).to eq(Date.new(2026, 10, 23))
  end

  it "falls back to the last cached set when the provider is down, then backs off" do
    cached = cache_rate_set(checked_at: now - 7.hours)
    request = stub_frankfurter(status: 500, body: "{}")

    expect(described_class.call).to eq(cached)
    travel 1.minute
    expect(described_class.call).to eq(cached)
    expect(request).to have_been_requested.once

    travel 5.minutes
    described_class.call
    expect(request).to have_been_requested.twice
  end

  it "returns nil when nothing is cached and the provider is down" do
    stub_request(:get, /frankfurter/).to_timeout

    expect(described_class.call).to be_nil
  end

  it "doesn't wait or fetch while another thread is refreshing" do
    cached = cache_rate_set(checked_at: now - 7.hours)
    lock = described_class.instance_variable_get(:@refresh_lock)
    holding = Queue.new
    release = Queue.new
    holder = Thread.new do
      lock.synchronize do
        holding << true
        release.pop
      end
    end
    holding.pop

    expect(described_class.call).to eq(cached)
    expect(a_request(:get, /frankfurter/)).not_to have_been_made
  ensure
    release << true
    holder&.join
  end
end
