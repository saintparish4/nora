module Api
  module V1
    class PriorAuthorizationsController < ApplicationController
      LIST_INCLUDES = [ :patient, :requirements, :requested_by, :assigned_to, :policy_template,
                        { patient_coverage: { insurance_plan: :payer } } ].freeze

      # GET /api/v1/prior_authorizations?status=&assigned_to_id=&patient_id=&open=true
      def index
        scope = current_organization.prior_authorizations.includes(*LIST_INCLUDES).order(updated_at: :desc)
        scope = scope.where(status: Array(params[:status])) if params[:status].present?
        scope = scope.where(assigned_to_id: params[:assigned_to_id]) if params[:assigned_to_id].present?
        scope = scope.where(patient_id: params[:patient_id]) if params[:patient_id].present?
        scope = scope.open if params[:open] == "true"
        records, meta = paginate(scope)
        log_phi_access_batch("PriorAuthorization", records.map(&:id), :view)
        render json: { prior_authorizations: records.map(&:as_api_json), meta: meta }
      end

      # GET /api/v1/prior_authorizations/:id
      def show
        pa = find_pa
        log_phi_access("PriorAuthorization", pa.id, :view)
        render json: { prior_authorization: pa.as_api_json(detail: true) }
      end

      # POST /api/v1/prior_authorizations
      def create
        patient = current_organization.patients.find(params.require(:patient_id))
        coverage = patient.coverages.find(params.require(:patient_coverage_id))
        requested_by = current_organization.users.find(params[:requested_by_id].presence || current_user.id)
        assigned_to = params[:assigned_to_id].present? ? current_organization.users.find(params[:assigned_to_id]) : current_user

        pa = Authorizations::CreateService.call(
          organization: current_organization, actor: current_user, patient: patient, coverage: coverage,
          item_name: params[:item_name], item_code: params[:item_code], requested_by: requested_by, assigned_to: assigned_to
        )
        log_phi_access("PriorAuthorization", pa.id, :create)
        render json: { prior_authorization: pa.as_api_json(detail: true) }, status: :created
      end

      # PATCH /api/v1/prior_authorizations/:id — assignment and time reporting only.
      def update
        pa = find_pa
        attrs = {}
        attrs[:assigned_to] = params[:assigned_to_id].present? ? current_organization.users.find(params[:assigned_to_id]) : nil if params.key?(:assigned_to_id)
        attrs[:prep_minutes_reported] = params[:prep_minutes_reported] if params.key?(:prep_minutes_reported)

        if pa.update(attrs)
          if attrs.key?(:assigned_to)
            WorkflowEvent.record!(subject: pa, event_type: "assigned", actor: current_user, payload: { assigned_to_id: pa.assigned_to_id })
          end
          log_phi_access("PriorAuthorization", pa.id, :update)
          render json: { prior_authorization: pa.as_api_json(detail: true) }
        else
          render json: { errors: pa.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/prior_authorizations/:id/extract
      def extract
        pa = Authorizations::StartExtractionService.call(find_pa, actor: current_user)
        log_phi_access("PriorAuthorization", pa.id, :update)
        render json: { prior_authorization: pa.as_api_json(detail: true) }, status: :accepted
      end

      # POST /api/v1/prior_authorizations/:id/question_help
      #
      # Explains one question from the payer's form against this patient's
      # chart. Nothing is stored.
      def question_help
        pa = find_pa
        result = Authorizations::QuestionHelpService.call(pa, question: params[:question])
        log_phi_access("PriorAuthorization", pa.id, :view)
        render json: { question_help: result }
      end

      # POST /api/v1/prior_authorizations/:id/approve
      def approve
        pa = Authorizations::ApproveService.call(find_pa, actor: current_user)
        log_phi_access("PriorAuthorization", pa.id, :update)
        render json: { prior_authorization: pa.reload.as_api_json(detail: true) }
      end

      # POST /api/v1/prior_authorizations/:id/transition
      def transition
        pa = Authorizations::ManualTransitionService.call(
          find_pa, actor: current_user, to: params.require(:to),
          payer_reference: params[:payer_reference], prep_minutes_reported: params[:prep_minutes_reported]
        )
        log_phi_access("PriorAuthorization", pa.id, :update)
        render json: { prior_authorization: pa.reload.as_api_json(detail: true) }
      end

      # GET /api/v1/prior_authorizations/:id/packet
      def packet
        pa = find_pa
        pdf = Authorizations::PacketService.call(pa)
        WorkflowEvent.record!(subject: pa, event_type: "packet_downloaded", actor: current_user)
        log_phi_access("PriorAuthorization", pa.id, :view)
        send_data pdf, filename: "prior-authorization-#{pa.id}.pdf", type: "application/pdf", disposition: "attachment"
      end

      # GET /api/v1/prior_authorizations/:id/events
      def events
        pa = find_pa
        events = pa.workflow_events.includes(:actor).order(:created_at, :id)
        log_phi_access("PriorAuthorization", pa.id, :view)
        render json: { events: events.map(&:as_api_json) }
      end

      private

      def find_pa
        current_organization.prior_authorizations.includes(*LIST_INCLUDES).find(params[:id])
      end
    end
  end
end
