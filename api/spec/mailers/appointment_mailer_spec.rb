require "rails_helper"

RSpec.describe AppointmentMailer, type: :mailer do
  describe "#booking_confirmation" do
    it "sends booking confirmation to the patient" do
      appointment = create(:appointment)

      mail = described_class.booking_confirmation(appointment)

      expect(mail.to).to eq([ appointment.patient.email ])
      expect(mail.subject).to include("Appointment Confirmed")
      expect(mail.subject).to include(appointment.provider.name)
    end

    it "skips delivery when patient has booking_confirmations disabled" do
      appointment = create(:appointment)
      appointment.patient.update_columns(booking_confirmations: false)
      appointment.patient.reload

      mail = described_class.booking_confirmation(appointment)

      expect(mail.message).to be_a(ActionMailer::Base::NullMail)
    end
  end

  describe "#cancellation_notice" do
    it "sends cancellation notice to the patient" do
      appointment = create(:appointment)

      mail = described_class.cancellation_notice(appointment, "patient")

      expect(mail.to).to eq([ appointment.patient.email ])
      expect(mail.subject).to include("Appointment Cancelled")
      expect(mail.subject).to include(appointment.provider.name)
    end

    it "skips delivery when patient has cancellation_notices disabled" do
      appointment = create(:appointment)
      appointment.patient.update_columns(cancellation_notices: false)
      appointment.patient.reload

      mail = described_class.cancellation_notice(appointment, "patient")

      expect(mail.message).to be_a(ActionMailer::Base::NullMail)
    end
  end

  describe "#reminder_24h" do
    it "sends 24-hour reminder to the patient" do
      appointment = create(:appointment)

      mail = described_class.reminder_24h(appointment)

      expect(mail.to).to eq([ appointment.patient.email ])
      expect(mail.subject).to include("Reminder")
      expect(mail.subject).to include(appointment.provider.name)
    end

    it "skips delivery when patient has reminders_24h disabled" do
      appointment = create(:appointment)
      appointment.patient.update_columns(reminders_24h: false)
      appointment.patient.reload

      mail = described_class.reminder_24h(appointment)

      expect(mail.message).to be_a(ActionMailer::Base::NullMail)
    end
  end
end
