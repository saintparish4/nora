require 'rails_helper'

RSpec.describe Appointment, type: :model do
  describe 'associations' do
    it { should belong_to(:patient).class_name('User') }
    it { should belong_to(:provider) }
  end

  describe 'validations' do
    it { should validate_presence_of(:start_time) }
    it { should validate_presence_of(:end_time) }
    it { should validate_inclusion_of(:status).in_array(%w[pending confirmed cancelled completed]) }
  end

  describe 'callbacks' do
    it 'enqueues booking confirmation email after create' do
      appointment = build(:appointment)
      mailer_double = instance_double(ActionMailer::MessageDelivery)
      allow(AppointmentMailer).to receive(:booking_confirmation).and_return(mailer_double)
      allow(mailer_double).to receive(:deliver_later)

      appointment.save!

      expect(AppointmentMailer).to have_received(:booking_confirmation).with(appointment)
      expect(mailer_double).to have_received(:deliver_later)
    end
  end

  describe '#duration_in_minutes' do
    let(:appointment) do
      create(:appointment,
        start_time: 1.hour.from_now,
        end_time: 1.hour.from_now + 30.minutes
      )
    end

    it 'returns duration in minutes' do
      expect(appointment.duration_in_minutes).to eq(30)
    end
  end

  describe 'custom validations' do
    context 'when end time is before start time' do
      it 'is invalid' do
        appointment = build(:appointment,
          start_time: 1.hour.from_now,
          end_time: 1.hour.from_now - 30.minutes
        )
        expect(appointment).not_to be_valid
        expect(appointment.errors[:end_time]).to include('must be after start time')
      end
    end

    context 'when start time is in the past' do
      it 'is invalid' do
        appointment = build(:appointment, start_time: 1.day.ago)
        expect(appointment).not_to be_valid
        expect(appointment.errors[:start_time]).to include('cannot be in the past')
      end
    end

    context 'when appointment overlaps with existing appointment' do
      let(:provider) { create(:provider) }
      let!(:existing_appointment) do
        create(:appointment,
          provider: provider,
          start_time: 2.days.from_now.change(hour: 10, min: 0),
          end_time: 2.days.from_now.change(hour: 10, min: 30)
        )
      end

      it 'is invalid' do
        overlapping_appointment = build(:appointment,
          provider: provider,
          start_time: 2.days.from_now.change(hour: 10, min: 15),
          end_time: 2.days.from_now.change(hour: 10, min: 45)
        )
        expect(overlapping_appointment).not_to be_valid
        expect(overlapping_appointment.errors[:base]).to include('This time slot is no longer available')
      end
    end
  end
end
