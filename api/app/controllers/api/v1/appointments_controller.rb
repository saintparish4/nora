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
          status: 'confirmed'
        )

        if appointment.save
          log_phi_access("Appointment", appointment.id, :create)
          render json: {
            message: 'Appointment booked successfully!',
            appointment: appointment.as_json(
              include: {
                provider: { only: [:id, :name, :specialty, :avatar_url] }
              }
            )
          }, status: :created
        else
          render json: {
            error: appointment.errors.full_messages.first || 'Failed to book appointment',
            errors: appointment.errors.full_messages 
          }, status: :unprocessable_entity
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Provider not found' }, status: :not_found
      end 

      # GET /api/v1/appointments
      def index
        appointments = current_user.appointments 
                                  .includes(:provider)
                                  .order(start_time: :desc)
                
        upcoming = appointments.upcoming
        past = appointments.past

        (upcoming + past).each { |appt| log_phi_access("Appointment", appt.id, :view) }

        render json: {
          upcoming: upcoming.as_json(
            include: {
              provider: { only: [:id, :name, :specialty, :avatar_url, :location] }
            }
          ),
          past: past.as_json(
            include: {
              provider: { only: [:id, :name, :specialty, :avatar_url, :location] }
            }
          )
        }
      end

      # GET /api/v1/appointments/:id
      def show 
        appointment = current_user.appointments.find(params[:id])
        log_phi_access("Appointment", appointment.id, :view)
        render json: {
          appointment: appointment.as_json(
            include: {
              provider: { only: [:id, :name, :specialty, :avatar_url, :location, :hourly_rate] }
            }
          )
        }
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Appointment not found' }, status: :not_found
      end

      # PATCH /api/v1/appointments/:id/cancel
      def cancel
        appointment = current_user.appointments.find(params[:id])

        if appointment.status == 'cancelled'
          return render json: { error: 'Appointment is already cancelled' }, status: :unprocessable_entity
        end

        if appointment.start_time < Time.current
          return render json: { error: 'Cannot cancel past appointments' }, status: :unprocessable_entity
        end

        if appointment.update(status: 'cancelled')
          log_phi_access("Appointment", appointment.id, :update)
          begin
            Notifications::NotificationService.send_cancellation_notifications(appointment, 'patient')
          rescue => e
            Rails.logger.error("Failed to send cancellation notifications: #{e.message}")
            # Continue even if notification fails - appointment is already cancelled
          end
          
          render json: {
            message: 'Appointment cancelled successfully',
            appointment: appointment.as_json(
              include: {
                provider: { only: [:id, :name, :specialty, :avatar_url, :location] }
              }
            )
          }
        else 
          render json: { error: 'Failed to cancel appointment' }, status: :unprocessable_entity
        end
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'Appointment not found' }, status: :not_found
      end
    end
  end
end
