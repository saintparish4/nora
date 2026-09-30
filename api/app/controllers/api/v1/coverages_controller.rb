module Api
  module V1
    class CoveragesController < ApplicationController
      # POST /api/v1/patients/:patient_id/coverages
      def create
        patient = current_organization.patients.find(params[:patient_id])
        plan = InsurancePlan.find_by(id: params[:insurance_plan_id])
        return render json: { errors: [ "Choose an insurance plan" ] }, status: :unprocessable_entity if plan.nil?

        coverage = patient.coverages.new(params.permit(:member_id, :group_number, :effective_on, :primary).merge(insurance_plan: plan))
        if coverage.save
          log_phi_access("PatientCoverage", coverage.id, :create)
          render json: { coverage: coverage.as_api_json }, status: :created
        else
          render json: { errors: coverage.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end
  end
end
