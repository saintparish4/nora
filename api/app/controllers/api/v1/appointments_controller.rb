module Api
  module V1
    class AppointmentsController < ApplicationController
      before_action :authenticate_request

      # POST /api/v1/appointments
      def create
        provider = Provider.find(params[:provider_id])

        appointment = current_user.appointments.new(
          provider: provider,
          start_time: params[:start_time],
          end_time: params[:end_time],
          notes: params[:notes],
          status: "confirmed"
        )

        if appointment.save
          log_phi_access("Appointment", appointment.id, :create)
          render json: {
            message: "Appointment booked successfully!",
            appointment: appointment.as_json.merge(
              provider: appointment.provider.as_summary_json
            )
          }, status: :created
        else
          render json: {
            error: appointment.errors.full_messages.first || "Failed to book appointment",
            errors: appointment.errors.full_messages
          }, status: :unprocessable_entity
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Provider not found" }, status: :not_found
      end

      # GET /api/v1/appointments
      def index
        appointments = current_user.appointments
                                  .includes(:provider)
                                  .order(start_time: :desc)

        upcoming = appointments.upcoming
        past = appointments.past

        log_phi_access_batch("Appointment", (upcoming + past).map(&:id), :view)

        render json: {
          upcoming: upcoming.map { |a| a.as_json.merge(provider: a.provider.as_summary_json) },
          past: past.map { |a| a.as_json.merge(provider: a.provider.as_summary_json) }
        }
      end

      # GET /api/v1/appointments/:id
      def show
        appointment = current_user.appointments.find(params[:id])
        log_phi_access("Appointment", appointment.id, :view)
        render json: {
          appointment: appointment.as_json.merge(
            provider: appointment.provider.as_detail_json
          )
        }
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Appointment not found" }, status: :not_found
      end

      # PATCH /api/v1/appointments/:id/cancel
      def cancel
        appointment = current_user.appointments.find(params[:id])

        if appointment.status == "cancelled"
          return render json: { error: "Appointment is already cancelled" }, status: :unprocessable_entity
        end

        if appointment.start_time < Time.current
          return render json: { error: "Cannot cancel past appointments" }, status: :unprocessable_entity
        end

        if appointment.update(status: "cancelled")
          log_phi_access("Appointment", appointment.id, :update)
          AppointmentMailer.cancellation_notice(appointment, "patient").deliver_later

          render json: {
            message: "Appointment cancelled successfully",
            appointment: appointment.as_json.merge(
              provider: appointment.provider.as_summary_json
            )
          }
        else
          render json: { error: "Failed to cancel appointment" }, status: :unprocessable_entity
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Appointment not found" }, status: :not_found
      end
    end
  end
end
