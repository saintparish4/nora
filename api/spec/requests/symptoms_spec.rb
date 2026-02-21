# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Symptoms API', type: :request do
  describe 'POST /api/v1/analyze-symptoms' do
    context 'with a valid description' do
      let(:analysis_result) do
        {
          specialty: 'dermatology',
          urgency: 'routine',
          reasoning: 'Skin condition.',
          keywords: ['rash'],
          red_flags: [],
          specialty_name: 'Dermatology',
          urgency_details: { priority: 1, color: 'green', message: 'Schedule within 1-2 weeks' }
        }
      end

      before do
        analyzer_double = instance_double(Triage::SymptomAnalyzerService, analyze: analysis_result)
        allow(Triage::SymptomAnalyzerService).to receive(:new).and_return(analyzer_double)
      end

      it 'returns 200 with analysis result' do
        post '/api/v1/analyze-symptoms', params: { description: 'I have a persistent rash on my arms' }

        expect(response).to have_http_status(:ok)
        expect(parsed_body['analysis']['specialty']).to eq('dermatology')
        expect(parsed_body['timestamp']).to be_present
      end
    end

    context 'with a missing description' do
      it 'returns 422 with error message' do
        post '/api/v1/analyze-symptoms', params: {}

        expect(response).to have_http_status(:unprocessable_content)
        expect(parsed_body['error']).to eq('Symptom description is required')
      end
    end

    context 'with an empty description' do
      it 'returns 422 with error message' do
        post '/api/v1/analyze-symptoms', params: { description: '' }

        expect(response).to have_http_status(:unprocessable_content)
        expect(parsed_body['error']).to eq('Symptom description is required')
      end
    end

    context 'with a description that is too short' do
      it 'returns 422 with error message' do
        post '/api/v1/analyze-symptoms', params: { description: 'headache' }

        expect(response).to have_http_status(:unprocessable_content)
        expect(parsed_body['error']).to eq('Please provide more details about your symptoms')
      end
    end

    context 'with a description that is too long' do
      it 'returns 422 with error message' do
        post '/api/v1/analyze-symptoms', params: { description: 'a' * 1001 }

        expect(response).to have_http_status(:unprocessable_content)
        expect(parsed_body['error']).to eq('Description is too long (max 1000 characters)')
      end
    end
  end
end
