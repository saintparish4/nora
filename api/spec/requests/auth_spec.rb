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
        expect(parsed_body['token']).to be_present
        expect(parsed_body['message']).to eq('Account created successfully')
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
      it 'returns 200 with user and token' do
        post '/api/v1/auth/login', params: { email: 'login@example.com', password: 'password123' }

        expect(response).to have_http_status(:ok)
        expect(parsed_body['user']['email']).to eq('login@example.com')
        expect(parsed_body['token']).to be_present
        expect(parsed_body['message']).to eq('Logged in successfully')
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
end
