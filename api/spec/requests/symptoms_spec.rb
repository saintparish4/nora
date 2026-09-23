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
          keywords: [ 'rash' ],
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
  describe 'recording the analysis' do
    let(:analysis) do
      {
        specialty: 'dermatology', urgency: 'routine', confidence: 78,
        reasoning: 'Common skin condition.', keywords: [ 'acne' ], red_flags: [],
        specialty_name: 'Dermatology',
        urgency_details: { priority: 1, color: 'green', message: 'Schedule within 1-2 weeks' }
      }
    end

    before do
      analyzer = instance_double(Triage::SymptomAnalyzerService, analyze: analysis)
      allow(Triage::SymptomAnalyzerService).to receive(:new).and_return(analyzer)
    end

    it 'records a risk assessment for a signed-in patient, with no conversation' do
      user = create(:user)

      expect {
        post '/api/v1/analyze-symptoms',
             params: { description: 'I have acne on my face and it is spreading' },
             headers: auth_headers(user)
      }.to change(RiskAssessment, :count).by(1)

      assessment = RiskAssessment.last
      expect(assessment.user).to eq(user)
      expect(assessment.conversation).to be_nil
      expect(assessment.confidence).to eq(78)
    end

    it 'records nothing for a guest' do
      expect {
        post '/api/v1/analyze-symptoms',
             params: { description: 'I have acne on my face and it is spreading' }
      }.not_to change(RiskAssessment, :count)
    end

    it 'still answers the patient when the write fails' do
      user = create(:user)
      allow(RiskAssessment).to receive(:create!).and_raise(ActiveRecord::StatementInvalid, 'boom')
      allow(Rails.logger).to receive(:error)

      post '/api/v1/analyze-symptoms',
           params: { description: 'I have acne on my face and it is spreading' },
           headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(parsed_body['analysis']['specialty']).to eq('dermatology')
    end
  end
end
