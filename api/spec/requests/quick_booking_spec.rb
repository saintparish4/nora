# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Quick Booking API', type: :request do
  let(:user) { create(:user) }

  # Stub external email delivery
  before do
    allow(Resend::Emails).to receive(:send).and_return({ 'id' => 'test' })
  end

  # Canned analysis result matching the SymptomAnalyzerService shape
  let(:analysis_result) do
    {
      specialty: 'dermatology',
      urgency: 'routine',
      reasoning: 'Skin-related symptoms suggest a dermatologist.',
      keywords: ['acne', 'face'],
      red_flags: [],
      specialty_name: 'Dermatology',
      urgency_details: { priority: 1, color: 'green', message: 'Schedule within 1-2 weeks' }
    }
  end

  # -----------------------------------------------------------------
  # POST /api/v1/quick-booking/analyze
  # -----------------------------------------------------------------
  describe 'POST /api/v1/quick-booking/analyze' do
    let!(:provider) do
      create(:provider, specialty: 'Dermatology', rating: 4.8)
    end

    before do
      analyzer_double = instance_double(Triage::SymptomAnalyzerService, analyze: analysis_result)
      allow(Triage::SymptomAnalyzerService).to receive(:new).and_return(analyzer_double)
    end

    context 'with a valid description' do
      it 'returns analysis and matching providers' do
        post '/api/v1/quick-booking/analyze', params: { description: 'I have acne on my face and it is getting worse' }

        expect(response).to have_http_status(:ok)
        expect(parsed_body['analysis']['specialty']).to eq('dermatology')
        expect(parsed_body['providers']).to be_an(Array)
        expect(parsed_body['total_providers']).to be >= 1
      end
    end

    context 'with a too-short description' do
      it 'returns 422' do
        post '/api/v1/quick-booking/analyze', params: { description: 'acne' }

        expect(response).to have_http_status(:unprocessable_content)
        expect(parsed_body['error']).to be_present
      end
    end
  end

  # -----------------------------------------------------------------
  # POST /api/v1/quick-booking/book
  # -----------------------------------------------------------------
  describe 'POST /api/v1/quick-booking/book' do
    let!(:provider) { create(:provider) }

    context 'with valid params and auth' do
      it 'creates the appointment and returns 201' do
        start_time = 3.days.from_now.change(hour: 14)
        end_time   = 3.days.from_now.change(hour: 14, min: 30)

        post '/api/v1/quick-booking/book',
             params: { provider_id: provider.id, start_time: start_time, end_time: end_time, notes: 'Quick booking' },
             headers: auth_headers(user)

        expect(response).to have_http_status(:created)
        expect(parsed_body['success']).to be true
        expect(parsed_body['appointment']['provider']['id']).to eq(provider.id)
      end
    end

    context 'without auth' do
      it 'returns 401' do
        post '/api/v1/quick-booking/book', params: { provider_id: provider.id }

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
