# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Demo practice API', type: :request do
  describe 'POST /api/v1/auth/demo' do
    context 'with the demo practice seeded' do
      before { seed_demo_practice }

      it 'signs the visitor in as the medical assistant and points at the featured request' do
        post '/api/v1/auth/demo'

        expect(response).to have_http_status(:ok)
        expect(parsed_body['user']).to include('email' => 'ma@nora.com', 'role' => 'staff')
        expect(parsed_body['user']['organization']).to include('name' => 'Demo Family Medicine', 'demo' => true)
        expect(parsed_body['featured_prior_authorization_id']).to eq(Demo::Practice.featured_request.id)

        get '/api/v1/auth/me'
        expect(parsed_body['user']['email']).to eq('ma@nora.com')
      end

      it 'signs in as the clinician when asked' do
        post '/api/v1/auth/demo', params: { role: 'clinician' }

        expect(parsed_body['user']).to include('email' => 'clinician@nora.com', 'role' => 'clinician')
      end

      it 'refuses the admin account and unknown roles' do
        %w[admin owner].each do |role|
          post '/api/v1/auth/demo', params: { role: role }
          expect(response).to have_http_status(:not_found)
        end

        get '/api/v1/auth/me'
        expect(response).to have_http_status(:unauthorized)
      end

      it 'never hands out API tokens' do
        post '/api/v1/auth/demo', headers: { 'X-Client-Type' => 'api' }

        expect(parsed_body).not_to have_key('token')
        expect(parsed_body).not_to have_key('refresh_token')
      end

      it 'is not offered when the demo is switched off' do
        allow(Demo::Practice).to receive(:enabled?).and_return(false)
        post '/api/v1/auth/demo'

        expect(response).to have_http_status(:not_found)
        expect(parsed_body['error']).to match(/not available/)
      end
    end

    it 'answers 404 when the practice has not been seeded' do
      post '/api/v1/auth/demo'
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'the locked staff and settings' do
    let(:organization) { create(:organization, demo: true) }
    let(:admin) { create(:user, :admin, organization: organization) }

    it 'refuses to rename the practice' do
      patch '/api/v1/organization', headers: auth_headers(admin), params: { name: 'Renamed' }

      expect(response).to have_http_status(:forbidden)
      expect(organization.reload.name).not_to eq('Renamed')
    end

    it 'refuses to add or change members' do
      post '/api/v1/organization/members', headers: auth_headers(admin), params: { email: 'x@example.com', password: 'temporary123' }
      expect(response).to have_http_status(:forbidden)

      patch "/api/v1/organization/members/#{admin.id}", headers: auth_headers(admin), params: { first_name: 'Renamed' }
      expect(response).to have_http_status(:forbidden)
      expect(organization.users.count).to eq(1)
    end

    it 'refuses profile changes' do
      patch '/api/v1/auth/profile', headers: auth_headers(admin), params: { first_name: 'Renamed' }

      expect(response).to have_http_status(:forbidden)
      expect(parsed_body['error']).to match(/demo practice/)
      expect(admin.reload.first_name).not_to eq('Renamed')
    end

    it 'reports the flag with the practice' do
      get '/api/v1/organization', headers: auth_headers(admin)
      expect(parsed_body['organization']['demo']).to be(true)
    end
  end
end
