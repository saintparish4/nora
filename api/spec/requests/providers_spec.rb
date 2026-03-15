# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Providers API', type: :request do
  # -----------------------------------------------------------------
  # GET /api/v1/providers
  # -----------------------------------------------------------------
  describe 'GET /api/v1/providers' do
    let!(:provider_a) { create(:provider, name: 'Dr. Alpha', specialty: 'Cardiology', rating: 4.9) }
    let!(:provider_b) { create(:provider, name: 'Dr. Beta', specialty: 'Dermatology', rating: 4.5) }

    context 'without filters' do
      it 'returns all providers' do
        get '/api/v1/providers'

        expect(response).to have_http_status(:ok)
        expect(parsed_body['providers'].length).to eq(2)
        expect(parsed_body['total']).to eq(2)
      end
    end

    context 'with specialty filter' do
      it 'returns only matching providers' do
        get '/api/v1/providers', params: { specialty: 'Cardiology' }

        expect(response).to have_http_status(:ok)
        expect(parsed_body['providers'].length).to eq(1)
        expect(parsed_body['providers'].first['name']).to eq('Dr. Alpha')
      end
    end

    context 'with sort by rating_desc' do
      it 'returns providers sorted by rating descending' do
        get '/api/v1/providers', params: { sort: 'rating_desc' }

        expect(response).to have_http_status(:ok)
        names = parsed_body['providers'].map { |p| p['name'] }
        expect(names).to eq([ 'Dr. Alpha', 'Dr. Beta' ])
      end
    end
  end

  # -----------------------------------------------------------------
  # GET /api/v1/providers/:id
  # -----------------------------------------------------------------
  describe 'GET /api/v1/providers/:id' do
    let!(:provider) { create(:provider) }

    context 'with a valid id' do
      it 'returns the provider with availabilities' do
        get "/api/v1/providers/#{provider.id}"

        expect(response).to have_http_status(:ok)
        expect(parsed_body['provider']['id']).to eq(provider.id)
        expect(parsed_body['provider']).to have_key('availabilities')
      end
    end

    context 'with a non-existent id' do
      it 'returns 404' do
        get '/api/v1/providers/0'

        expect(response).to have_http_status(:not_found)
        expect(parsed_body['error']).to eq('Provider not found')
      end
    end
  end

  # -----------------------------------------------------------------
  # GET /api/v1/providers/:id/available_slots
  # -----------------------------------------------------------------
  describe 'GET /api/v1/providers/:id/available_slots' do
    let!(:provider) { create(:provider) }

    context 'when the provider has availability' do
      before do
        tomorrow_wday = Date.tomorrow.wday
        provider.availabilities.create!(
          day_of_week: tomorrow_wday,
          start_time: '09:00',
          end_time: '12:00',
          is_available: true
        )
      end

      it 'returns grouped slots' do
        get "/api/v1/providers/#{provider.id}/available_slots"

        expect(response).to have_http_status(:ok)
        expect(parsed_body['provider_id']).to eq(provider.id)
        expect(parsed_body['total_slots']).to be > 0
        expect(parsed_body['slots']).to be_a(Hash)
        expect(parsed_body['date_range']).to have_key('start_date')
      end
    end

    context 'when the provider has no availability' do
      it 'returns empty slots' do
        get "/api/v1/providers/#{provider.id}/available_slots"

        expect(response).to have_http_status(:ok)
        expect(parsed_body['total_slots']).to eq(0)
      end
    end

    context 'with a non-existent provider' do
      it 'returns 404' do
        get '/api/v1/providers/0/available_slots'

        expect(response).to have_http_status(:not_found)
        expect(parsed_body['error']).to eq('Provider not found')
      end
    end
  end
end
