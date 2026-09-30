module Api
  module V1
    class AuthorizationEvidenceController < ApplicationController
      # PATCH /api/v1/authorization_evidence/:id  { action: verify | reject }
      def update
        evidence = AuthorizationEvidence.joins(authorization_requirement: :prior_authorization)
                                        .where(prior_authorizations: { organization_id: current_organization.id })
                                        .find(params[:id])
        Authorizations::EvidenceReviewService.call(evidence, actor: current_user, action: params.require(:review))
        pa = evidence.authorization_requirement.prior_authorization.reload
        log_phi_access("PriorAuthorization", pa.id, :update)
        render json: { prior_authorization: pa.as_api_json(detail: true) }
      end
    end
  end
end
