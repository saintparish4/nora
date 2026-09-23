# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Care Preferences API', type: :request do
  let(:user) { create(:user) }

  describe 'GET /api/v1/care-preferences' do
    it 'returns 401 without a token' do
      get '/api/v1/care-preferences'

      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns empty defaults for a patient who has never set any' do
      get '/api/v1/care-preferences', headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      prefs = parsed_body['care_preferences']
      expect(prefs['preferred_location']).to be_nil
      expect(prefs['preferred_times']).to eq([])
      expect(prefs['language_preferences']).to eq([])
    end

    it 'does not create a row just because the page was opened' do
      expect {
        get '/api/v1/care-preferences', headers: auth_headers(user)
      }.not_to change(UserPreference, :count)
    end

    it 'returns the stored preferences' do
      create(:user_preference, user: user, preferred_location: 'Austin, TX',
                               preferred_times: %w[morning evening],
                               provider_gender_preference: 'female',
                               language_preferences: %w[English Spanish])

      get '/api/v1/care-preferences', headers: auth_headers(user)

      prefs = parsed_body['care_preferences']
      expect(prefs['preferred_location']).to eq('Austin, TX')
      expect(prefs['preferred_times']).to eq(%w[morning evening])
      expect(prefs['provider_gender_preference']).to eq('female')
      expect(prefs['language_preferences']).to eq(%w[English Spanish])
    end

    it 'does not leak another patient\'s preferences' do
      create(:user_preference, user: create(:user), preferred_location: 'Somewhere Else')

      get '/api/v1/care-preferences', headers: auth_headers(user)

      expect(parsed_body['care_preferences']['preferred_location']).to be_nil
    end
  end

  describe 'PATCH /api/v1/care-preferences' do
    it 'returns 401 without a token' do
      patch '/api/v1/care-preferences', params: { preferred_location: 'Austin, TX' }

      expect(response).to have_http_status(:unauthorized)
    end

    it 'creates the row on first save' do
      expect {
        patch '/api/v1/care-preferences',
              params: { preferred_location: 'Austin, TX' },
              headers: auth_headers(user)
      }.to change(UserPreference, :count).by(1)

      expect(response).to have_http_status(:ok)
      expect(user.reload.user_preference.preferred_location).to eq('Austin, TX')
    end

    it 'updates the existing row rather than adding a second one' do
      create(:user_preference, user: user, preferred_location: 'Austin, TX')

      expect {
        patch '/api/v1/care-preferences',
              params: { preferred_location: 'Dallas, TX' },
              headers: auth_headers(user)
      }.not_to change(UserPreference, :count)

      expect(user.reload.user_preference.preferred_location).to eq('Dallas, TX')
    end

    it 'stores array preferences' do
      patch '/api/v1/care-preferences',
            params: { preferred_times: %w[morning afternoon], language_preferences: [ 'Spanish' ] },
            headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      prefs = parsed_body['care_preferences']
      expect(prefs['preferred_times']).to eq(%w[morning afternoon])
      expect(prefs['language_preferences']).to eq([ 'Spanish' ])
    end

    it 'ignores fields that are not preferences' do
      patch '/api/v1/care-preferences',
            params: { preferred_location: 'Austin, TX', user_id: 99_999 },
            headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(user.reload.user_preference.user_id).to eq(user.id)
    end

    it 'writes a PHI access log' do
      expect {
        patch '/api/v1/care-preferences',
              params: { preferred_location: 'Austin, TX' },
              headers: auth_headers(user)
      }.to change { PhiAccessLog.where(resource_type: 'UserPreference', action: 'update').count }.by(1)
    end
  end
end
