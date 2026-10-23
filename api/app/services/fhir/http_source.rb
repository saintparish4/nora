require "net/http"

module Fhir
  # A FHIR R4 server: GET reads and searches, first page of each search.
  class HttpSource
    TIMEOUT = 10

    attr_reader :label

    # @param token [String, nil] a fixed bearer token (FHIR_BEARER_TOKEN)
    # @param auth [#token, nil] fetches one instead, e.g. SmartBackendAuth
    def initialize(base:, token: nil, auth: nil)
      @base = base.chomp("/")
      @token = token
      @auth = auth
      @label = URI(@base).host
    end

    def read(type, id)
      get("#{type}/#{id}")
    rescue Error => e
      raise unless e.message.start_with?("404")

      nil
    end

    def search(type, params = {})
      query = params.compact.transform_keys(&:to_s).merge("_count" => "100")
      bundle = get("#{type}?#{URI.encode_www_form(query)}")
      Array(bundle["entry"]).map { |entry| entry["resource"] }.select { |r| r["resourceType"] == type }
    end

    private

    def get(path)
      uri = URI("#{@base}/#{path}")
      request = Net::HTTP::Get.new(uri, "Accept" => "application/fhir+json")
      token = @auth&.token || @token
      request["Authorization"] = "Bearer #{token}" if token
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: TIMEOUT, read_timeout: TIMEOUT) do |http|
        http.request(request)
      end
      raise Error, "#{response.code} from the FHIR server for #{path.split('?').first}" unless response.is_a?(Net::HTTPSuccess)

      JSON.parse(response.body)
    rescue SocketError, Errno::ECONNREFUSED, Net::OpenTimeout, Net::ReadTimeout => e
      raise Error, "Could not reach the FHIR server: #{e.class.name.demodulize}"
    end
  end
end
