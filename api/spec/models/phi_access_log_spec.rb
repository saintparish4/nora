# frozen_string_literal: true

require 'rails_helper'

RSpec.describe PhiAccessLog, type: :model do
  subject(:log) do
    described_class.create!(
      user_id: 1,
      resource_type: 'Appointment',
      resource_id: '42',
      action: 'view',
      session_id: 'sess_abc',
      request_id: 'req_xyz',
      ip_address: '127.0.0.1'
    )
  end

  # -----------------------------------------------------------------
  # Validations
  # -----------------------------------------------------------------
  describe 'validations' do
    it 'is valid with all required fields' do
      record = described_class.new(
        user_id: 1,
        resource_type: 'Appointment',
        resource_id: '42',
        action: 'view',
        session_id: 'sess_abc',
        request_id: 'req_xyz',
        ip_address: '127.0.0.1'
      )
      expect(record).to be_valid
    end

    it 'requires resource_type' do
      record = described_class.new(resource_id: '1', action: 'view')
      expect(record).not_to be_valid
      expect(record.errors[:resource_type]).to include("can't be blank")
    end

    it 'requires resource_id' do
      record = described_class.new(resource_type: 'Appointment', action: 'view')
      expect(record).not_to be_valid
      expect(record.errors[:resource_id]).to include("can't be blank")
    end

    it 'requires action' do
      record = described_class.new(resource_type: 'Appointment', resource_id: '1')
      expect(record).not_to be_valid
      expect(record.errors[:action]).to include("can't be blank")
    end

    it 'rejects invalid actions' do
      record = described_class.new(
        resource_type: 'Appointment',
        resource_id: '1',
        action: 'hack'
      )
      expect(record).not_to be_valid
      expect(record.errors[:action]).to include('is not included in the list')
    end

    it 'allows nil user_id (unauthenticated flows)' do
      record = described_class.create!(
        user_id: nil,
        resource_type: 'SymptomAnalysis',
        resource_id: 'req_123',
        action: 'create'
      )
      expect(record).to be_persisted
      expect(record.user_id).to be_nil
    end
  end

  # -----------------------------------------------------------------
  # Immutability
  # -----------------------------------------------------------------
  describe 'immutability' do
    it 'prevents updates' do
      expect { log.update!(action: 'delete') }
        .to raise_error(ActiveRecord::ReadOnlyRecord)
    end
  end

  # -----------------------------------------------------------------
  # Scopes
  # -----------------------------------------------------------------
  describe 'scopes' do
    before do
      described_class.create!(user_id: 1, resource_type: 'Appointment', resource_id: '10', action: 'view')
      described_class.create!(user_id: 1, resource_type: 'Conversation', resource_id: '20', action: 'create')
      described_class.create!(user_id: 2, resource_type: 'Appointment', resource_id: '10', action: 'update')
      described_class.create!(user_id: nil, resource_type: 'SymptomAnalysis', resource_id: '30', action: 'create')
    end

    it '.for_user filters by user_id' do
      expect(described_class.for_user(1).count).to eq(2)
    end

    it '.for_resource filters by type and id' do
      expect(described_class.for_resource('Appointment', '10').count).to eq(2)
    end

    it '.by_action filters by action' do
      expect(described_class.by_action('create').count).to eq(2)
    end

    it '.between filters by time range' do
      travel_to(1.hour.from_now) do
        described_class.create!(
          user_id: 1,
          resource_type: 'Appointment',
          resource_id: '99',
          action: 'view'
        )
      end

      results = described_class.between(30.minutes.from_now, 2.hours.from_now)
      expect(results.count).to eq(1)
      expect(results.first.resource_id).to eq('99')
    end
  end
end
