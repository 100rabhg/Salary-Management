require "net/http"

module ExchangeRates
  # Fetches the latest ECB reference rates for the supported currencies from
  # Frankfurter's v2 API. Frankfurter blends several providers unless
  # providers=ECB is given, so the request always names it.
  class FrankfurterClient
    Error = Class.new(StandardError)

    DEFAULT_URL = "https://api.frankfurter.dev/v2"
    QUOTES = (Country::CURRENCIES - [ RateSet.base ]).freeze

    def initialize(base_url: ENV.fetch("EXCHANGE_RATES_URL", DEFAULT_URL), open_timeout: 2, read_timeout: 3)
      @base_url = base_url.chomp("/")
      @open_timeout = open_timeout
      @read_timeout = read_timeout
    end

    # Returns the parsed rows: [{ "date", "base", "quote", "rate" }, ...].
    def fetch
      uri = URI("#{@base_url}/rates")
      uri.query = URI.encode_www_form(
        base: RateSet.base, quotes: QUOTES.join(","), providers: RateSet.provider
      )
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https",
        open_timeout: @open_timeout, read_timeout: @read_timeout) do |http|
        http.get(uri.request_uri, "Accept" => "application/json")
      end
      raise Error, "Frankfurter returned HTTP #{response.code}" unless response.is_a?(Net::HTTPSuccess)

      JSON.parse(response.body)
    rescue Timeout::Error, SystemCallError, SocketError, OpenSSL::SSL::SSLError,
      Net::HTTPBadResponse, JSON::ParserError => error
      raise Error, "Frankfurter request failed: #{error.class}: #{error.message}"
    end
  end
end
