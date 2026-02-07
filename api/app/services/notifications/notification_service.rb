module Notifications
  class NotificationService
    def self.send_booking_notifications(appointment)
      return unless appointment&.patient&.booking_confirmations
      
      # Send booking confirmation to patient using Resend
      send_email(
        to: appointment.patient.email,
        subject: "Appointment Confirmed - #{appointment.provider.name}",
        html: render_template('booking_confirmation', appointment: appointment)
      )
      
      # Provider notification (currently disabled - no provider email field)
    rescue => e
      Rails.logger.error("Failed to send booking notifications: #{e.message}")
      # Don't raise - we don't want email failures to block appointment creation
    end

    def self.send_cancellation_notifications(appointment, cancelled_by)
      return unless appointment&.patient&.cancellation_notices
      
      send_email(
        to: appointment.patient.email,
        subject: "Appointment Cancelled - #{appointment.provider.name}",
        html: render_template('cancellation_notice', appointment: appointment, cancelled_by: cancelled_by)
      )
    rescue => e
      Rails.logger.error("Failed to send cancellation notifications: #{e.message}")
    end

    def self.send_reminder_notifications
      # Find appointments that are 24 hours away
      tomorrow_start = 24.hours.from_now.beginning_of_hour
      tomorrow_end = tomorrow_start + 1.hour

      appointments = Appointment.includes(:patient, :provider)
                               .where(status: 'confirmed')
                               .where(start_time: tomorrow_start..tomorrow_end)

      appointments.each do |appointment|
        next unless appointment&.patient&.reminders_24h
        
        send_email(
          to: appointment.patient.email,
          subject: "Reminder: Appointment Tomorrow with #{appointment.provider.name}",
          html: render_template('reminder_24h', appointment: appointment)
        )
      end
    end

    private

    def self.send_email(to:, subject:, html:)
      params = {
        from: ENV['RESEND_FROM_EMAIL'] || 'Sana Health <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: html
      }

      Resend::Emails.send(params)
    end

    def self.render_template(template_name, locals = {})
      # Render the email template using ActionView
      ApplicationController.render(
        template: "appointment_mailer/#{template_name}",
        layout: 'mailer',
        locals: locals.merge(
          appointment: locals[:appointment],
          patient: locals[:appointment]&.patient,
          provider: locals[:appointment]&.provider,
          cancelled_by: locals[:cancelled_by]
        )
      )
    end
  end
end
