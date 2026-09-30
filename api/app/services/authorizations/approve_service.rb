module Authorizations
  # A clinician or admin signs off on the prepared packet. The approval pins a
  # digest of the content; any later edit voids it (see StatusSyncService).
  class ApproveService
    def self.call(...) = new(...).call

    def initialize(prior_authorization, actor:)
      @pa = prior_authorization
      @actor = actor
    end

    def call
      raise Error, "Only a clinician or an admin can approve a prior authorization." unless @actor.approver?
      raise Error, "Only a prior authorization that is ready for review can be approved." unless @pa.status == "ready_for_review"

      @pa.requirements.reset
      raise Error, "Every requirement must be met or marked not applicable first." unless @pa.all_requirements_resolved?

      Approval.transaction do
        digest = @pa.content_digest
        Approval.create!(approvable: @pa, approved_by: @actor, content_digest: digest)
        WorkflowEvent.record!(subject: @pa, event_type: "approved", actor: @actor, payload: { content_digest: digest })
        TransitionService.call(@pa, to: "approved", actor: @actor)
      end
    end
  end
end
