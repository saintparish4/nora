class AppointmentReminderJob < ApplicationJob
  queue_as :default

  def perform
    tomorrow_start = 24.hours.from_now.beginning_of_hour
    tomorrow_end = tomorrow_start + 1.hour

    appointments = Appointment.includes(:patient, :provider)
                              .where(status: "confirmed")
                              .where(start_time: tomorrow_start..tomorrow_end)

    appointments.find_each do |appointment|
      AppointmentMailer.reminder_24h(appointment).deliver_later
    end
  end
end
