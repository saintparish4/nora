module Api
  module V1
    class PatientsController < ApplicationController
      # GET /api/v1/patients?q=
      def index
        scope = current_organization.patients.order(:last_name, :first_name)
        scope = scope.search(params[:q]) if params[:q].present?
        patients, meta = paginate(scope)
        log_phi_access_batch("Patient", patients.map(&:id), :view)
        render json: { patients: patients.map(&:as_api_json), meta: meta }
      end

      # GET /api/v1/patients/:id
      def show
        patient = find_patient
        log_phi_access("Patient", patient.id, :view)
        render json: {
          patient: patient.as_api_json,
          coverages: patient.coverages.includes(insurance_plan: :payer).map(&:as_api_json),
          chart_documents: patient.chart_documents.includes(:uploaded_by).order(occurred_on: :desc, id: :desc).map(&:as_api_json),
          prior_authorizations: patient.prior_authorizations
                                       .includes(:requirements, :requested_by, :assigned_to, :policy_template, patient_coverage: { insurance_plan: :payer })
                                       .order(created_at: :desc).map(&:as_api_json)
        }
      end

      # POST /api/v1/patients
      def create
        patient = current_organization.patients.new(patient_params)
        if patient.save
          log_phi_access("Patient", patient.id, :create)
          render json: { patient: patient.as_api_json }, status: :created
        else
          render json: { errors: patient.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/patients/:id
      def update
        patient = find_patient
        if patient.update(patient_params)
          log_phi_access("Patient", patient.id, :update)
          render json: { patient: patient.as_api_json }
        else
          render json: { errors: patient.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def find_patient
        current_organization.patients.find(params[:id])
      end

      def patient_params
        params.permit(:mrn, :first_name, :last_name, :date_of_birth, :sex)
      end
    end
  end
end
