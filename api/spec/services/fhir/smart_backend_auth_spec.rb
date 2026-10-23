# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Fhir::SmartBackendAuth do
  let(:key) { OpenSSL::PKey::RSA.new(2048) }
  let(:base) { 'https://fhir.example.org/r4' }
  let(:token_url) { 'https://auth.example.org/token' }
  let(:now) { Time.zone.local(2026, 10, 23, 12) }
  let(:clock) { -> { now } }
  let(:auth) { described_class.new(base: base, client_id: 'nora-client', private_key: key, clock: clock) }

  before do
    stub_request(:get, "#{base}/.well-known/smart-configuration")
      .to_return(body: { token_endpoint: token_url, token_endpoint_auth_methods_supported: [ 'private_key_jwt' ] }.to_json)
  end

  def stub_token(access_token = 'tok-1')
    stub_request(:post, token_url).to_return(body: { access_token: access_token, token_type: 'bearer', expires_in: 300 }.to_json)
  end

  it 'finds the token endpoint, and trades a client assertion signed with its key for an access token' do
    stub_token
    expect(auth.token).to eq('tok-1')

    expect(WebMock).to(have_requested(:post, token_url).with do |req|
      form = URI.decode_www_form(req.body).to_h
      jwks = JWT::JWK::Set.new(described_class.jwks(key).deep_stringify_keys)
      claims, header = travel_to(now) { JWT.decode(form['client_assertion'], nil, true, algorithms: [ 'RS384' ], jwks: jwks, aud: token_url, verify_aud: true) }
      form['grant_type'] == 'client_credentials' &&
        form['client_assertion_type'] == 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer' &&
        form['scope'].split.include?('system/Coverage.rs') &&
        claims.values_at('iss', 'sub') == %w[nora-client nora-client] && claims['exp'] - claims['iat'] <= 300 &&
        header['kid'] == jwks.keys.first[:kid]
    end)
  end

  it 'reuses the token until a minute before it expires' do
    stub_token
    auth.token
    now = self.now
    later = described_class.new(base: base, client_id: 'nora-client', private_key: key, clock: -> { now })
    later.token
    now += 241
    later.token
    expect(WebMock).to have_requested(:post, token_url).times(3)
  end

  it 'reads the FHIR server with the token it was given' do
    stub_token('tok-9')
    read = stub_request(:get, "#{base}/Patient/p1").with(headers: { 'Authorization' => 'Bearer tok-9' }).to_return(body: { resourceType: 'Patient', id: 'p1' }.to_json)

    expect(Fhir::HttpSource.new(base: base, auth: auth).read('Patient', 'p1')).to include('id' => 'p1')
    expect(read).to have_been_requested
  end

  it 'publishes only the public key' do
    jwk = described_class.jwks(key)[:keys].first
    expect(jwk).to include(kty: 'RSA', alg: 'RS384', use: 'sig', n: be_present, e: be_present, kid: be_present)
    expect(jwk.keys).not_to include(:d, :p, :q)
  end
end

RSpec.describe 'GET /.well-known/jwks.json', type: :request do
  it 'is not found unless Nora is set up as a SMART client' do
    get '/.well-known/jwks.json'
    expect(response).to have_http_status(:not_found)
  end

  it "serves Nora's public key when it is" do
    key = OpenSSL::PKey::RSA.new(2048)
    env = { 'FHIR_BASE_URL' => 'https://fhir.example.org/r4', 'FHIR_CLIENT_ID' => 'nora', 'FHIR_PRIVATE_KEY' => key.to_pem }
    allow(ENV).to receive(:[]).and_call_original
    env.each { |name, value| allow(ENV).to receive(:[]).with(name).and_return(value) }
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:fetch).with('FHIR_BASE_URL').and_return(env['FHIR_BASE_URL'])

    get '/.well-known/jwks.json'
    expect(parsed_body['keys'].first).to include('kty' => 'RSA', 'alg' => 'RS384').and(satisfy { |k| !k.key?('d') })
  end
end
