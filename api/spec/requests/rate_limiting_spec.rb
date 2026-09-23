# frozen_string_literal: true

require 'rails_helper'

# The throttles themselves live in config/initializers/rack_attack.rb. This spec
# exists mainly to pin the *response*: the custom responder previously used a
# removed 4-argument signature, so hitting any limit raised ArgumentError and the
# caller got an HTML 500 instead of the JSON 429 the frontend expects.
RSpec.describe 'Rate limiting', type: :request do
  let(:limit) { 10 } # auth/ip throttle

  def post_login
    post '/api/v1/auth/login', params: { email: 'nobody@example.com', password: 'wrong' }
  end

  it 'lets requests through below the limit' do
    limit.times { post_login }

    expect(response).to have_http_status(:unauthorized)
  end

  it 'returns a JSON 429 once the limit is exceeded' do
    (limit + 1).times { post_login }

    expect(response).to have_http_status(:too_many_requests)
    expect(response.media_type).to eq('application/json')

    body = parsed_body
    expect(body['error']).to eq('Rate limit exceeded')
    expect(body['throttle']).to eq('auth/ip')
    expect(body['retry_after']).to be_positive
  end

  it 'sets a Retry-After header matching the throttle period' do
    (limit + 1).times { post_login }

    expect(response.headers['Retry-After']).to eq('60')
  end
end
