# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Appointments::SlotGeneratorService do
  let(:provider) { create(:provider) }
  let(:service) { described_class.new(provider) }

  describe '#generate_available_slots' do
    context 'when the provider has no availability records' do
      it 'returns an empty array' do
        slots = service.generate_available_slots
        expect(slots).to eq([])
      end
    end

    context 'when the provider has availability for tomorrow' do
      before do
        tomorrow_wday = Date.tomorrow.wday
        provider.availabilities.create!(
          day_of_week: tomorrow_wday,
          start_time: '09:00',
          end_time: '10:00',
          is_available: true
        )
      end

      it 'generates 30-minute slots within the availability window' do
        slots = service.generate_available_slots

        # 09:00–10:00 = two 30-min slots (09:00 and 09:30)
        tomorrow_slots = slots.select { |s| s[:date] == Date.tomorrow.to_s }
        expect(tomorrow_slots.length).to eq(2)
        expect(tomorrow_slots.first[:time]).to eq('09:00 AM')
      end
    end

    context 'when is_available is false' do
      before do
        tomorrow_wday = Date.tomorrow.wday
        provider.availabilities.create!(
          day_of_week: tomorrow_wday,
          start_time: '09:00',
          end_time: '12:00',
          is_available: false
        )
      end

      it 'returns no slots for that day' do
        slots = service.generate_available_slots
        tomorrow_slots = slots.select { |s| s[:date] == Date.tomorrow.to_s }
        expect(tomorrow_slots).to be_empty
      end
    end

    context 'when a slot is already booked' do
      let(:user) { create(:user) }

      before do
        tomorrow_wday = Date.tomorrow.wday
        provider.availabilities.create!(
          day_of_week: tomorrow_wday,
          start_time: '09:00',
          end_time: '10:00',
          is_available: true
        )

        # Book the first slot (09:00–09:30)
        # Stub notification to avoid Resend call
        allow(Resend::Emails).to receive(:send).and_return({ 'id' => 'test' })
        create(:appointment,
          provider: provider,
          patient: user,
          start_time: Date.tomorrow.in_time_zone.change(hour: 9, min: 0),
          end_time: Date.tomorrow.in_time_zone.change(hour: 9, min: 30),
          status: 'confirmed'
        )
      end

      it 'excludes the booked slot' do
        slots = service.generate_available_slots
        tomorrow_slots = slots.select { |s| s[:date] == Date.tomorrow.to_s }

        # Only the 09:30–10:00 slot should remain
        expect(tomorrow_slots.length).to eq(1)
        expect(tomorrow_slots.first[:time]).to eq('09:30 AM')
      end
    end

    context 'when appointment is cancelled (should not block slot)' do
      let(:user) { create(:user) }

      before do
        tomorrow_wday = Date.tomorrow.wday
        provider.availabilities.create!(
          day_of_week: tomorrow_wday,
          start_time: '09:00',
          end_time: '10:00',
          is_available: true
        )

        allow(Resend::Emails).to receive(:send).and_return({ 'id' => 'test' })
        create(:appointment,
          provider: provider,
          patient: user,
          start_time: Date.tomorrow.in_time_zone.change(hour: 9, min: 0),
          end_time: Date.tomorrow.in_time_zone.change(hour: 9, min: 30),
          status: 'cancelled'
        )
      end

      it 'includes the slot since the appointment was cancelled' do
        slots = service.generate_available_slots
        tomorrow_slots = slots.select { |s| s[:date] == Date.tomorrow.to_s }

        expect(tomorrow_slots.length).to eq(2)
      end
    end
  end
end
