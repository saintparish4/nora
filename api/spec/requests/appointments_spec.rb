# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Appointments API', type: :request do
  let(:user) { create(:user) }
  let(:provider) { create(:provider) }

  # Stub external email delivery so appointment callbacks don't fail
  before do
    allow(Resend::Emails).to receive(:send).and_return({ 'id' => 'test' })
  end

  # -----------------------------------------------------------------
  # POST /api/v1/appointments – happy path
  # -----------------------------------------------------------------
  describe 'POST /api/v1/appointments' do
    context 'with valid params' do
      it 'returns 201 and creates the appointment' do
        start_time = 3.days.from_now.change(hour: 10)
        end_time   = 3.days.from_now.change(hour: 10, min: 30)

        post '/api/v1/appointments',
             params: { provider_id: provider.id, start_time: start_time, end_time: end_time, notes: 'Checkup' },
             headers: auth_headers(user)

        expect(response).to have_http_status(:created)
        expect(parsed_body['message']).to eq('Appointment booked successfully!')
        expect(parsed_body['appointment']['provider']['id']).to eq(provider.id)
      end
    end

    context 'without an Authorization header' do
      it 'returns 401 Unauthorized' do
        post '/api/v1/appointments', params: {
          provider_id: provider.id,
          start_time: 3.days.from_now.change(hour: 10),
          end_time: 3.days.from_now.change(hour: 10, min: 30)
        }

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'with a non-existent provider_id' do
      it 'returns 404 Provider not found' do
        post '/api/v1/appointments',
             params: { provider_id: 0, start_time: 3.days.from_now, end_time: 3.days.from_now + 30.minutes },
             headers: auth_headers(user)

        expect(response).to have_http_status(:not_found)
        expect(parsed_body['error']).to eq('Provider not found')
      end
    end

    context 'with end_time before start_time' do
      it 'returns 422 with validation error' do
        post '/api/v1/appointments',
             params: {
               provider_id: provider.id,
               start_time: 3.days.from_now.change(hour: 10),
               end_time: 3.days.from_now.change(hour: 9)
             },
             headers: auth_headers(user)

        expect(response).to have_http_status(:unprocessable_content)
        expect(parsed_body['errors']).to be_present
      end
    end

    context 'with an overlapping appointment' do
      let!(:existing) do
        create(:appointment,
          provider: provider,
          patient: create(:user),
          start_time: 3.days.from_now.change(hour: 10),
          end_time: 3.days.from_now.change(hour: 10, min: 30)
        )
      end

      it 'returns 422 with overlap error' do
        post '/api/v1/appointments',
             params: {
               provider_id: provider.id,
               start_time: 3.days.from_now.change(hour: 10, min: 15),
               end_time: 3.days.from_now.change(hour: 10, min: 45)
             },
             headers: auth_headers(user)

        expect(response).to have_http_status(:unprocessable_content)
        expect(parsed_body['error']).to include('no longer available')
      end
    end
  end

  # -----------------------------------------------------------------
  # GET /api/v1/appointments – happy path
  # -----------------------------------------------------------------
  describe 'GET /api/v1/appointments' do
    let!(:appointment) { create(:appointment, patient: user, provider: provider) }

    it 'returns the current user appointments split into upcoming and past' do
      get '/api/v1/appointments', headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(parsed_body).to have_key('upcoming')
      expect(parsed_body).to have_key('past')
    end
  end

  # -----------------------------------------------------------------
  # GET /api/v1/appointments/:id – happy path + error
  # -----------------------------------------------------------------
  describe 'GET /api/v1/appointments/:id' do
    context 'with own appointment' do
      let!(:appointment) { create(:appointment, patient: user, provider: provider) }

      it 'returns the appointment' do
        get "/api/v1/appointments/#{appointment.id}", headers: auth_headers(user)

        expect(response).to have_http_status(:ok)
        expect(parsed_body['appointment']['id']).to eq(appointment.id)
      end
    end

    context 'when the appointment belongs to a different user' do
      let(:other_user) { create(:user) }
      let!(:other_appointment) do
        create(:appointment,
          patient: other_user,
          provider: provider,
          start_time: 4.days.from_now.change(hour: 14),
          end_time: 4.days.from_now.change(hour: 14, min: 30)
        )
      end

      it 'returns 404 Appointment not found' do
        get "/api/v1/appointments/#{other_appointment.id}", headers: auth_headers(user)

        expect(response).to have_http_status(:not_found)
        expect(parsed_body['error']).to eq('Appointment not found')
      end
    end
  end

  # -----------------------------------------------------------------
  # PATCH /api/v1/appointments/:id/cancel – happy path + edge cases
  # -----------------------------------------------------------------
  describe 'PATCH /api/v1/appointments/:id/cancel' do
    context 'with own confirmed appointment' do
      let!(:appointment) { create(:appointment, patient: user, provider: provider) }

      it 'cancels the appointment successfully' do
        patch "/api/v1/appointments/#{appointment.id}/cancel", headers: auth_headers(user)

        expect(response).to have_http_status(:ok)
        expect(parsed_body['message']).to eq('Appointment cancelled successfully')
        expect(parsed_body['appointment']['status']).to eq('cancelled')
      end
    end

    context 'with an already-cancelled appointment' do
      let!(:cancelled_appointment) do
        create(:appointment, patient: user, provider: provider, status: 'cancelled')
      end

      it 'returns 422 with already-cancelled error' do
        patch "/api/v1/appointments/#{cancelled_appointment.id}/cancel", headers: auth_headers(user)

        expect(response).to have_http_status(:unprocessable_content)
        expect(parsed_body['error']).to eq('Appointment is already cancelled')
      end
    end

    context 'with a past appointment' do
      let!(:past_appointment) do
        travel_to(3.days.ago) do
          create(:appointment,
            patient: user,
            provider: provider,
            start_time: 1.day.from_now.change(hour: 10),
            end_time: 1.day.from_now.change(hour: 10, min: 30)
          )
        end
      end

      it 'returns 422 with cannot-cancel-past error' do
        patch "/api/v1/appointments/#{past_appointment.id}/cancel", headers: auth_headers(user)

        expect(response).to have_http_status(:unprocessable_content)
        expect(parsed_body['error']).to eq('Cannot cancel past appointments')
      end
    end

    context 'with a non-existent appointment id' do
      it 'returns 404 Appointment not found' do
        patch '/api/v1/appointments/0/cancel', headers: auth_headers(user)

        expect(response).to have_http_status(:not_found)
        expect(parsed_body['error']).to eq('Appointment not found')
      end
    end
  end
end
