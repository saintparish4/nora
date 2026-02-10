# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'PHI access audit log integration', type: :request do
  def auth_headers(user)
    token = JsonWebToken.encode(user_id: user.id)
    { 'Authorization' => "Bearer #{token}" }
  end

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
end
