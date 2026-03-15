class AppointmentMailer < ApplicationMailer
  def booking_confirmation(appointment)
    @appointment = appointment
    @patient = appointment.patient
    @provider = appointment.provider

    return unless @patient.booking_confirmations

    mail(
      to: @patient.email,
      subject: "Appointment Confirmed - #{@provider.name}"
    )
  end

  def provider_notification(appointment)
    @appointment = appointment
    @patient = appointment.patient
    @provider = appointment.provider

    # In a real app, provider would have an email field
    # For now, send to a placeholder or skip
    # Returning without calling mail() will return nil
    nil
  end

  def cancellation_notice(appointment, cancelled_by)
    @appointment = appointment
    @patient = appointment.patient
    @provider = appointment.provider
    @cancelled_by = cancelled_by

    return unless @patient.cancellation_notices

    mail(
      to: @patient.email,
      subject: "Appointment Cancelled - #{@provider.name}"
    )
  end

  def reminder_24h(appointment)
    @appointment = appointment
    @patient = appointment.patient
    @provider = appointment.provider

    return unless @patient.reminders_24h

    mail(
      to: @patient.email,
      subject: "Reminder: Appointment Tomorrow with #{@provider.name}"
    )
  end
end
