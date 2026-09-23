# frozen_string_literal: true

require 'rails_helper'

# Covers the three things that make the auth path safe rather than merely
# working: nothing readable ends up in the browser, the cookie path proves
# intent, and a long-lived credential can be rotated and revoked.
RSpec.describe 'Auth hardening', type: :request do
  let(:password) { 'password123' }
  let!(:user) do
    create(:user, email: 'patient@example.com', password: password,
                  password_confirmation: password)
  end

  # A real API client is not a browser and has no session cookie. Request specs
  # keep cookies between calls, so drop it — otherwise the session would
  # authenticate these requests and the token assertions would prove nothing.
  def login_as_api_client
    post '/api/v1/auth/login',
         params: { email: user.email, password: password },
         headers: { 'X-Client-Type' => 'api' }
    body = parsed_body
    cookies.delete('_nora_session')
    body
  end

  describe 'credential exposure' do
    it 'gives a browser an httpOnly session cookie and nothing else' do
      post '/api/v1/auth/login', params: { email: user.email, password: password }

      expect(parsed_body).not_to have_key('token')
      expect(parsed_body).not_to have_key('refresh_token')

      set_cookie = response.headers['Set-Cookie'].to_s
      expect(set_cookie).to include('_nora_session')
      expect(set_cookie).to match(/HttpOnly/i)
    end

    it 'never sends SameSite=None without Secure' do
      # Browsers drop such a cookie outright and say nothing, so the patient
      # just looks logged out. curl does not enforce the rule, which means this
      # cannot be caught by hitting the API from a shell — only here, or in a
      # real browser.
      post '/api/v1/auth/login', params: { email: user.email, password: password }

      set_cookie = response.headers['Set-Cookie'].to_s
      expect(set_cookie).to match(/Secure/i) if set_cookie.match?(/SameSite=None/i)
    end

    it 'uses a SameSite policy the current environment can actually deliver' do
      post '/api/v1/auth/login', params: { email: user.email, password: password }

      set_cookie = response.headers['Set-Cookie'].to_s

      # Test runs without HTTPS, so the cookie must be Lax: localhost:3000 and
      # localhost:3001 are the same site, so nothing is lost by it.
      expect(set_cookie).to match(/SameSite=Lax/i)
      expect(set_cookie).not_to match(/SameSite=None/i)
    end

    it 'gives an explicit API client a bearer token and a refresh token' do
      body = login_as_api_client

      expect(body['token']).to be_present
      expect(body['refresh_token']).to be_present
      expect(body['expires_in']).to eq(JsonWebToken::ACCESS_TOKEN_TTL.to_i)
    end

    it 'stores only a digest of the refresh token' do
      raw = login_as_api_client['refresh_token']

      expect(RefreshToken.pluck(:token_digest)).not_to include(raw)
      expect(RefreshToken.find_by_raw(raw)).to be_present
    end
  end

  describe 'access token expiry' do
    it 'issues short-lived access tokens' do
      expect(JsonWebToken::ACCESS_TOKEN_TTL).to be <= 1.hour
    end

    it 'rejects an expired access token' do
      token = login_as_api_client['token']

      travel_to(JsonWebToken::ACCESS_TOKEN_TTL.from_now + 1.minute) do
        get '/api/v1/auth/me', headers: { 'Authorization' => "Bearer #{token}" }

        expect(response).to have_http_status(:unauthorized)
      end
    end

    it 'accepts an access token inside its window' do
      token = login_as_api_client['token']

      get '/api/v1/auth/me', headers: { 'Authorization' => "Bearer #{token}" }

      expect(response).to have_http_status(:ok)
      expect(parsed_body['user']['email']).to eq(user.email)
    end
  end

  describe 'POST /api/v1/auth/refresh' do
    it 'exchanges a refresh token for a new access token' do
      refresh_token = login_as_api_client['refresh_token']

      post '/api/v1/auth/refresh', params: { refresh_token: refresh_token }

      expect(response).to have_http_status(:ok)
      expect(parsed_body['token']).to be_present
      expect(parsed_body['user']['email']).to eq(user.email)
    end

    it 'rotates the refresh token, so each one works exactly once' do
      first = login_as_api_client['refresh_token']

      post '/api/v1/auth/refresh', params: { refresh_token: first }
      second = parsed_body['refresh_token']

      expect(second).to be_present
      expect(second).not_to eq(first)
      expect(RefreshToken.find_by_raw(first).revoked_at).to be_present
    end

    it 'treats reuse of a rotated token as a compromise and revokes everything' do
      first = login_as_api_client['refresh_token']
      post '/api/v1/auth/refresh', params: { refresh_token: first }
      second = parsed_body['refresh_token']

      # The attacker (or a buggy client) replays the burnt token.
      post '/api/v1/auth/refresh', params: { refresh_token: first }

      expect(response).to have_http_status(:unauthorized)
      expect(parsed_body['code']).to eq('refresh_token_reuse')

      # The legitimate client's newer token dies too. That is the point: we
      # cannot tell which side is the attacker, so both start over.
      post '/api/v1/auth/refresh', params: { refresh_token: second }
      expect(response).to have_http_status(:unauthorized)
    end

    it 'rejects an expired refresh token' do
      refresh_token = login_as_api_client['refresh_token']

      travel_to(RefreshToken::LIFETIME.from_now + 1.day) do
        post '/api/v1/auth/refresh', params: { refresh_token: refresh_token }

        expect(response).to have_http_status(:unauthorized)
        expect(parsed_body['error']).to match(/expired/i)
      end
    end

    it 'rejects a token that was never issued' do
      post '/api/v1/auth/refresh', params: { refresh_token: 'not-a-real-token' }

      expect(response).to have_http_status(:unauthorized)
    end

    it 'rejects a blank token' do
      post '/api/v1/auth/refresh', params: { refresh_token: '' }

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'DELETE /api/v1/auth/logout' do
    it 'revokes outstanding refresh tokens, not just the cookie' do
      body = login_as_api_client
      refresh_token = body['refresh_token']

      delete '/api/v1/auth/logout', headers: { 'Authorization' => "Bearer #{body['token']}" }
      expect(response).to have_http_status(:ok)

      post '/api/v1/auth/refresh', params: { refresh_token: refresh_token }
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'GET /api/v1/auth/csrf' do
    it 'hands out a token without requiring authentication' do
      get '/api/v1/auth/csrf'

      expect(response).to have_http_status(:ok)
      expect(parsed_body['csrf_token']).to be_present
    end
  end

  describe 'CSRF enforcement on the cookie path' do
    around do |example|
      # The suite disables forgery protection globally; these specs are the
      # reason it exists, so switch it back on just here. It has to be set on
      # ApplicationController — ActionController::Base is a different hierarchy
      # from the API stack this app runs on, so setting it there does nothing.
      original = ApplicationController.allow_forgery_protection
      ApplicationController.allow_forgery_protection = true
      example.run
      ApplicationController.allow_forgery_protection = original
    end

    it 'rejects a cookie-authenticated mutation with no CSRF token' do
      post '/api/v1/auth/login', params: { email: user.email, password: password }

      patch '/api/v1/auth/profile', params: { first_name: 'Mallory' }

      expect(response).to have_http_status(:forbidden)
      expect(parsed_body['code']).to eq('invalid_csrf_token')
      expect(user.reload.first_name).not_to eq('Mallory')
    end

    it 'allows a cookie-authenticated mutation carrying a valid CSRF token' do
      post '/api/v1/auth/login', params: { email: user.email, password: password }
      get '/api/v1/auth/csrf'
      csrf = parsed_body['csrf_token']

      patch '/api/v1/auth/profile',
            params: { first_name: 'Ada' },
            headers: { 'X-CSRF-Token' => csrf }

      expect(response).to have_http_status(:ok)
      expect(user.reload.first_name).to eq('Ada')
    end

    it 'does not demand a CSRF token from a bearer-token client' do
      body = login_as_api_client

      patch '/api/v1/auth/profile',
            params: { first_name: 'Grace' },
            headers: { 'Authorization' => "Bearer #{body['token']}" }

      expect(response).to have_http_status(:ok)
      expect(user.reload.first_name).to eq('Grace')
    end
  end
end
