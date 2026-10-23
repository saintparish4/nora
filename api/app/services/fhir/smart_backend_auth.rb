require "net/http"

module Fhir
  # SMART Backend Services authorization (SMART App Launch 2.2): Nora as a
  # confidential client with an asymmetric key, the way a server-side app
  # reads an EHR's FHIR API (Epic calls these "backend system" apps).
  #
  # Nora signs a short-lived JWT with its private key, trades it at the token
  # endpoint for an access token (client_credentials), and reads with that.
  # The server checks the signature against Nora's public key, published at
  # GET /.well-known/jwks.json.
  class SmartBackendAuth
    SCOPE = %w[Patient Coverage MedicationRequest Condition Observation Practitioner].map { |type| "system/#{type}.rs" }.join(" ").freeze
    ALG = "RS384".freeze
    TIMEOUT = 10

    def self.from_env
      pem = ENV["FHIR_PRIVATE_KEY"].presence || ENV["FHIR_PRIVATE_KEY_PATH"].presence&.then { |path| File.read(path) }
      return unless ENV["FHIR_CLIENT_ID"].present? && pem

      new(base: ENV.fetch("FHIR_BASE_URL"), client_id: ENV["FHIR_CLIENT_ID"], private_key: OpenSSL::PKey::RSA.new(pem),
          token_url: ENV["FHIR_TOKEN_URL"].presence, scope: ENV["FHIR_SCOPE"].presence || SCOPE)
    end

    # Nora's public key as a JWK Set, for the authorization server.
    def self.jwks(private_key)
      { keys: [ jwk(private_key).export.merge(alg: ALG, use: "sig") ] }
    end

    def self.jwk(private_key) = JWT::JWK.new(private_key, { alg: ALG, use: "sig" }, kid_generator: JWT::JWK::Thumbprint)

    attr_reader :private_key

    def initialize(base:, client_id:, private_key:, token_url: nil, scope: SCOPE, clock: -> { Time.current })
      @base = base.chomp("/")
      @client_id = client_id
      @private_key = private_key
      @token_url = token_url
      @scope = scope
      @clock = clock
    end

    # A current access token, fetched again a minute before it expires.
    def token
      return @token if @token && @clock.call < @expires_at - 60

      body = post_form(token_url, grant_type: "client_credentials", scope: @scope,
                                  client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                                  client_assertion: assertion)
      @expires_at = @clock.call + body.fetch("expires_in", 300).to_i
      @token = body.fetch("access_token")
    end

    # The token endpoint, from the server's .well-known/smart-configuration
    # unless FHIR_TOKEN_URL names it.
    def token_url
      @token_url ||= begin
        config = get_json("#{@base}/.well-known/smart-configuration")
        config["token_endpoint"] or raise Error, "The FHIR server's SMART configuration names no token endpoint"
      end
    end

    private

    def assertion
      now = @clock.call.to_i
      claims = { iss: @client_id, sub: @client_id, aud: token_url, exp: now + 300, iat: now, jti: SecureRandom.uuid }
      JWT.encode(claims, @private_key, ALG, kid: self.class.jwk(@private_key).kid, typ: "JWT")
    end

    def get_json(url)
      request(URI(url)) { |uri| Net::HTTP::Get.new(uri, "Accept" => "application/json") }
    end

    def post_form(url, form)
      request(URI(url)) do |uri|
        Net::HTTP::Post.new(uri, "Accept" => "application/json").tap { |r| r.set_form_data(form) }
      end
    end

    def request(uri)
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: TIMEOUT, read_timeout: TIMEOUT) do |http|
        http.request(yield(uri))
      end
      raise Error, "#{response.code} from the authorization server at #{uri.path}" unless response.is_a?(Net::HTTPSuccess)

      JSON.parse(response.body)
    rescue SocketError, Errno::ECONNREFUSED, Net::OpenTimeout, Net::ReadTimeout => e
      raise Error, "Could not reach the authorization server: #{e.class.name.demodulize}"
    end
  end
end
