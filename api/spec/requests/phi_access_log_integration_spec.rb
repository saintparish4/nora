# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'PHI access audit log integration', type: :request do
  describe 'GET /api/v1/auth/me' do
    let(:user) { create(:user) }

    it 'creates a PhiAccessLog row with expected resource_type, resource_id and action' do
      expect {
        get '/api/v1/auth/me', headers: auth_headers(user)
      }.to change(PhiAccessLog, :count).by(1)

      expect(response).to have_http_status(:ok)

      log = PhiAccessLog.last
      expect(log.resource_type).to eq('User')
      expect(log.resource_id).to eq(user.id.to_s)
      expect(log.action).to eq('view')
      expect(log.user_id).to eq(user.id)
    end
  end

  describe 'GET /api/v1/appointments/:id' do
    let(:user) { create(:user) }
    let(:provider) { create(:provider) }
    let!(:appointment) do
      create(:appointment, patient: user, provider: provider)
    end

    it 'creates a PhiAccessLog row with expected resource_type, resource_id and action' do
      expect {
        get "/api/v1/appointments/#{appointment.id}", headers: auth_headers(user)
      }.to change(PhiAccessLog, :count).by(1)

      expect(response).to have_http_status(:ok)

      log = PhiAccessLog.last
      expect(log.resource_type).to eq('Appointment')
      expect(log.resource_id).to eq(appointment.id.to_s)
      expect(log.action).to eq('view')
      expect(log.user_id).to eq(user.id)
    end
  end

  # The batch path (log_phi_access_batch) had no coverage, and an `updated_at`
  # key in its insert_all payload meant every batched write was rejected and
  # swallowed by the rescue. The largest PHI read in the app went unaudited.
  describe 'GET /api/v1/appointments (batch logging)' do
    let(:user) { create(:user) }
    let(:provider) { create(:provider) }
    let!(:appointments) do
      [
        create(:appointment, patient: user, provider: provider, start_time: 2.days.from_now,
                             end_time: 2.days.from_now + 30.minutes),
        create(:appointment, patient: user, provider: provider, start_time: 3.days.from_now,
                             end_time: 3.days.from_now + 30.minutes)
      ]
    end

    it 'writes one audit row per appointment returned' do
      expect {
        get '/api/v1/appointments', headers: auth_headers(user)
      }.to change(PhiAccessLog, :count).by(2)

      expect(response).to have_http_status(:ok)

      logs = PhiAccessLog.where(resource_type: 'Appointment', action: 'view')
      expect(logs.pluck(:resource_id)).to match_array(appointments.map { |a| a.id.to_s })
      expect(logs.pluck(:user_id).uniq).to eq([ user.id ])
      expect(logs.pluck(:created_at)).to all(be_present)
    end

    it 'writes nothing when the patient has no appointments' do
      appointments.each(&:destroy)

      expect {
        get '/api/v1/appointments', headers: auth_headers(user)
      }.not_to change(PhiAccessLog, :count)
    end
  end
end
