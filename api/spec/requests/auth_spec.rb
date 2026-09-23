# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Auth API', type: :request do
  # -----------------------------------------------------------------
  # GET /api/v1/auth/me
  # -----------------------------------------------------------------
  describe 'GET /api/v1/auth/me' do
    context 'with a valid token' do
      let(:user) { create(:user) }

      it 'returns 200 with user data' do
        get '/api/v1/auth/me', headers: auth_headers(user)

        expect(response).to have_http_status(:ok)
        expect(parsed_body['user']['id']).to eq(user.id)
        expect(parsed_body['user']['email']).to eq(user.email)
      end
    end

    context 'without an Authorization header' do
      it 'returns 401 Unauthorized' do
        get '/api/v1/auth/me'

        expect(response).to have_http_status(:unauthorized)
        expect(parsed_body['error']).to eq('Unauthorized')
      end
    end

    context 'with an invalid token' do
      it 'returns 401 Unauthorized' do
        get '/api/v1/auth/me', headers: { 'Authorization' => 'Bearer invalid.token.here' }

        expect(response).to have_http_status(:unauthorized)
        expect(parsed_body['error']).to eq('Unauthorized')
      end
    end
  end

  # -----------------------------------------------------------------
  # POST /api/v1/auth/signup
  # -----------------------------------------------------------------
  describe 'POST /api/v1/auth/signup' do
    context 'with valid params' do
      it 'returns 201 and creates a user' do
        post '/api/v1/auth/signup', params: {
          email: 'newuser@example.com',
          password: 'password123',
          password_confirmation: 'password123'
        }

        expect(response).to have_http_status(:created)
        expect(parsed_body['user']['email']).to eq('newuser@example.com')
        expect(parsed_body['message']).to eq('Account created successfully')
        # A browser gets the httpOnly session cookie and nothing readable.
        expect(parsed_body).not_to have_key('token')
        expect(parsed_body).not_to have_key('refresh_token')
      end
    end

    context 'with missing email' do
      it 'returns 422 with validation errors' do
        post '/api/v1/auth/signup', params: { password: 'password123', password_confirmation: 'password123' }

        expect(response).to have_http_status(:unprocessable_content)
        expect(parsed_body['errors']).to be_present
      end
    end

    context 'with a password that is too short' do
      it 'returns 422 with validation errors' do
        post '/api/v1/auth/signup', params: { email: 'test@example.com', password: 'short', password_confirmation: 'short' }

        expect(response).to have_http_status(:unprocessable_content)
        expect(parsed_body['errors']).to be_present
      end
    end

    context 'with a duplicate email' do
      let!(:existing_user) { create(:user, email: 'taken@example.com') }

      it 'returns 422 with validation errors' do
        post '/api/v1/auth/signup', params: { email: 'taken@example.com', password: 'password123', password_confirmation: 'password123' }

        expect(response).to have_http_status(:unprocessable_content)
        expect(parsed_body['errors']).to include(a_string_matching(/email/i))
      end
    end
  end

  # -----------------------------------------------------------------
  # POST /api/v1/auth/login
  # -----------------------------------------------------------------
  describe 'POST /api/v1/auth/login' do
    let!(:user) { create(:user, email: 'login@example.com', password: 'password123', password_confirmation: 'password123') }

    context 'with valid credentials' do
      it 'returns 200 with the user and no readable credential' do
        post '/api/v1/auth/login', params: { email: 'login@example.com', password: 'password123' }

        expect(response).to have_http_status(:ok)
        expect(parsed_body['user']['email']).to eq('login@example.com')
        expect(parsed_body['message']).to eq('Logged in successfully')
        expect(parsed_body).not_to have_key('token')
      end
    end

    context 'with a wrong password' do
      it 'returns 401 with error message' do
        post '/api/v1/auth/login', params: { email: 'login@example.com', password: 'wrongpassword' }

        expect(response).to have_http_status(:unauthorized)
        expect(parsed_body['error']).to eq('Invalid email or password')
      end
    end

    context 'with a non-existent email' do
      it 'returns 401 with error message' do
        post '/api/v1/auth/login', params: { email: 'nobody@example.com', password: 'password123' }

        expect(response).to have_http_status(:unauthorized)
        expect(parsed_body['error']).to eq('Invalid email or password')
      end
    end
  end

  # -----------------------------------------------------------------
  # DELETE /api/v1/auth/logout
  # -----------------------------------------------------------------
  describe 'DELETE /api/v1/auth/logout' do
    let(:user) { create(:user) }

    it 'returns 200 with logged out message' do
      delete '/api/v1/auth/logout', headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(parsed_body['message']).to eq('Logged out successfully')
    end
  end

  # -----------------------------------------------------------------
  # PATCH /api/v1/auth/update_preferences
  # -----------------------------------------------------------------
  describe 'PATCH /api/v1/auth/update_preferences' do
    let(:user) { create(:user, booking_confirmations: true, reminders_24h: true, cancellation_notices: true) }

    context 'with valid params' do
      it 'updates preferences and returns the updated user' do
        patch '/api/v1/auth/update_preferences',
              params: { booking_confirmations: false, reminders_24h: false },
              headers: auth_headers(user)

        expect(response).to have_http_status(:ok)
        expect(parsed_body['message']).to eq('Preferences updated successfully')
        expect(parsed_body['user']['booking_confirmations']).to be false
        expect(parsed_body['user']['reminders_24h']).to be false
        expect(parsed_body['user']['cancellation_notices']).to be true
      end
    end

    context 'without auth' do
      it 'returns 401 Unauthorized' do
        patch '/api/v1/auth/update_preferences', params: { booking_confirmations: false }

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  # -----------------------------------------------------------------
  # PATCH /api/v1/auth/profile
  # -----------------------------------------------------------------
  describe 'PATCH /api/v1/auth/profile' do
    let(:user) { create(:user) }

    it 'updates the profile fields and returns the updated user' do
      patch '/api/v1/auth/profile',
            params: { first_name: 'Ada', last_name: 'Lovelace', state: 'TX', phone: '5125550123' },
            headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(parsed_body['message']).to eq('Profile updated successfully')
      expect(parsed_body['user']['first_name']).to eq('Ada')
      expect(parsed_body['user']['last_name']).to eq('Lovelace')
      expect(parsed_body['user']['state']).to eq('TX')
      expect(parsed_body['user']['phone']).to eq('5125550123')
    end

    it 'returns 422 for an invalid phone number' do
      patch '/api/v1/auth/profile',
            params: { phone: '555-0123' },
            headers: auth_headers(user)

      expect(response).to have_http_status(:unprocessable_content)
      expect(parsed_body['errors'].join).to include('must be 10 digits')
    end

    it 'ignores an attempt to change the email' do
      original = user.email

      patch '/api/v1/auth/profile',
            params: { first_name: 'Ada', email: 'hijack@example.com' },
            headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(user.reload.email).to eq(original)
    end

    it 'writes a PHI access log' do
      expect {
        patch '/api/v1/auth/profile', params: { first_name: 'Ada' }, headers: auth_headers(user)
      }.to change { PhiAccessLog.where(resource_type: 'User', action: 'update').count }.by(1)
    end

    it 'returns 401 without auth' do
      patch '/api/v1/auth/profile', params: { first_name: 'Ada' }

      expect(response).to have_http_status(:unauthorized)
    end
  end

  # -----------------------------------------------------------------
  # Login lockout — complements the per-IP Rack::Attack throttle
  # -----------------------------------------------------------------
  describe 'login lockout' do
    let!(:user) { create(:user, password: 'password123', password_confirmation: 'password123') }

    def fail_login(times)
      times.times do
        post '/api/v1/auth/login', params: { email: user.email, password: 'wrong' }
      end
    end

    it 'counts failed attempts on the account' do
      fail_login(3)

      expect(user.reload.failed_login_attempts).to eq(3)
      expect(user.reload).not_to be_locked
    end

    it 'locks the account after the maximum number of failures' do
      fail_login(User::MAX_FAILED_LOGIN_ATTEMPTS)

      expect(user.reload).to be_locked
    end

    it 'returns 429 with a retry hint while locked' do
      fail_login(User::MAX_FAILED_LOGIN_ATTEMPTS)

      post '/api/v1/auth/login', params: { email: user.email, password: 'password123' }

      expect(response).to have_http_status(:too_many_requests)
      expect(parsed_body['error']).to include('Too many failed attempts')
      expect(parsed_body['retry_after']).to be_positive
    end

    it 'refuses the correct password while locked' do
      fail_login(User::MAX_FAILED_LOGIN_ATTEMPTS)

      post '/api/v1/auth/login', params: { email: user.email, password: 'password123' }

      expect(parsed_body['token']).to be_nil
    end

    it 'lets the patient back in once the lockout expires' do
      fail_login(User::MAX_FAILED_LOGIN_ATTEMPTS)

      travel_to(User::LOCKOUT_DURATION.from_now + 1.minute) do
        post '/api/v1/auth/login', params: { email: user.email, password: 'password123' }

        expect(response).to have_http_status(:ok)
        expect(parsed_body['user']).to be_present
      end
    end

    it 'resets the counter after a successful login' do
      fail_login(3)

      post '/api/v1/auth/login', params: { email: user.email, password: 'password123' }

      expect(response).to have_http_status(:ok)
      expect(user.reload.failed_login_attempts).to be_zero
    end

    it 'answers the same way for an unknown email, so accounts cannot be enumerated' do
      post '/api/v1/auth/login', params: { email: 'nobody@example.com', password: 'whatever' }

      expect(response).to have_http_status(:unauthorized)
      expect(parsed_body['error']).to eq('Invalid email or password')
    end
  end

  # -----------------------------------------------------------------
  # User payload contract — the settings page reads these off /me
  # -----------------------------------------------------------------
  describe 'user payload' do
    let(:user) do
      create(:user, first_name: 'Ada', booking_confirmations: false,
                    reminders_24h: true, cancellation_notices: false)
    end

    it 'includes the email preference booleans on GET /me' do
      get '/api/v1/auth/me', headers: auth_headers(user)

      body = parsed_body['user']
      expect(body['booking_confirmations']).to be false
      expect(body['reminders_24h']).to be true
      expect(body['cancellation_notices']).to be false
    end

    it 'includes them on login too' do
      post '/api/v1/auth/login', params: { email: user.email, password: 'password123' }

      expect(parsed_body['user']).to include(
        'booking_confirmations' => false,
        'reminders_24h' => true,
        'cancellation_notices' => false
      )
    end

    it 'never includes the password digest' do
      get '/api/v1/auth/me', headers: auth_headers(user)

      expect(parsed_body['user']).not_to have_key('password_digest')
    end
  end
end
