require 'rails_helper'

RSpec.describe Notifications::NotificationService do
  describe '.send_booking_notifications' do
    it 'sends booking confirmation to patient via Resend' do
      # Build appointment without saving to avoid callback
      appointment = build(:appointment)
      
      # Stub the callback during save
      allow(Notifications::NotificationService).to receive(:send_booking_notifications)
      appointment.save!
      
      # Clear the stub and test the actual service
      allow(Notifications::NotificationService).to receive(:send_booking_notifications).and_call_original
      
      # Mock Resend API call
      expect(Resend::Emails).to receive(:send).with(hash_including(
        to: [appointment.patient.email],
        subject: "Appointment Confirmed - #{appointment.provider.name}"
      ))
      
      Notifications::NotificationService.send_booking_notifications(appointment)
    end
    
    it 'respects patient notification preferences' do
      appointment = build(:appointment)
      appointment.patient.booking_confirmations = false
      
      allow(Notifications::NotificationService).to receive(:send_booking_notifications)
      appointment.save!
      allow(Notifications::NotificationService).to receive(:send_booking_notifications).and_call_original
      
      # Should not call Resend if preference is disabled
      expect(Resend::Emails).not_to receive(:send)
      
      Notifications::NotificationService.send_booking_notifications(appointment)
    end
  end
  
  describe '.send_cancellation_notifications' do
    it 'sends cancellation notice via Resend' do
      appointment = create(:appointment)
      
      expect(Resend::Emails).to receive(:send).with(hash_including(
        to: [appointment.patient.email],
        subject: "Appointment Cancelled - #{appointment.provider.name}"
      ))
      
      Notifications::NotificationService.send_cancellation_notifications(appointment, 'patient')
    end
    
    it 'respects patient notification preferences' do
      appointment = create(:appointment)
      appointment.patient.cancellation_notices = false
      appointment.patient.password = 'password123'
      appointment.patient.password_confirmation = 'password123'
      appointment.patient.save!
      
      expect(Resend::Emails).not_to receive(:send)
      
      Notifications::NotificationService.send_cancellation_notifications(appointment, 'patient')
    end
  end
  
  describe '.send_reminder_notifications' do
    it 'sends reminders for appointments 24 hours away' do
      # Create appointment that's 24 hours away
      start = 24.hours.from_now.beginning_of_hour + 15.minutes
      tomorrow_appointment = create(:appointment, start_time: start, end_time: start + 30.minutes)
      
      # Create appointment that's a week away (should not get reminder)
      start_next_week = 7.days.from_now
      next_week_appointment = create(:appointment, start_time: start_next_week, end_time: start_next_week + 30.minutes)
      
      # Should only send one email for tomorrow's appointment
      expect(Resend::Emails).to receive(:send).once
      
      Notifications::NotificationService.send_reminder_notifications
    end
    
    it 'respects patient notification preferences for reminders' do
      start = 24.hours.from_now.beginning_of_hour + 15.minutes
      appointment = create(:appointment, start_time: start, end_time: start + 30.minutes)
      appointment.patient.reminders_24h = false
      appointment.patient.password = 'password123'
      appointment.patient.password_confirmation = 'password123'
      appointment.patient.save!
      
      expect(Resend::Emails).not_to receive(:send)
      
      Notifications::NotificationService.send_reminder_notifications
    end
  end
end