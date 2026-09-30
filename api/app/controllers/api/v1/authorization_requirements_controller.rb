module Api
  module V1
    class AuthorizationRequirementsController < ApplicationController
      # PATCH /api/v1/authorization_requirements/:id  { status, note }
      def update
        requirement = scoped_requirements.find(params[:id])
        Authorizations::RequirementReviewService.call(requirement, actor: current_user, status: params.require(:status),
                                                                   note: params.key?(:note) ? params[:note].to_s : nil)
        pa = requirement.prior_authorization.reload
        log_phi_access("PriorAuthorization", pa.id, :update)
        render json: { prior_authorization: pa.as_api_json(detail: true) }
      end

      # POST /api/v1/authorization_requirements/:id/evidence  { chart_document_id, quote }
      def add_evidence
        requirement = scoped_requirements.find(params[:id])
        document = current_organization.chart_documents.find(params.require(:chart_document_id))
        Authorizations::AddEvidenceService.call(requirement, actor: current_user, document: document, quote: params.require(:quote))
        pa = requirement.prior_authorization.reload
        log_phi_access("PriorAuthorization", pa.id, :update)
        render json: { prior_authorization: pa.as_api_json(detail: true) }, status: :created
      end

      private

      def scoped_requirements
        AuthorizationRequirement.joins(:prior_authorization)
                                .where(prior_authorizations: { organization_id: current_organization.id })
      end
    end
  end
end
