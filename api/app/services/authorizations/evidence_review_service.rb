module Authorizations
  # A person verifies or rejects a piece of evidence. Rejecting the last
  # verified evidence behind a met requirement sends it back to pending: the
  # requirement cannot stay met on nothing.
  class EvidenceReviewService
    ACTIONS = %w[verify reject].freeze

    def self.call(...) = new(...).call

    def initialize(evidence, actor:, action:)
      @evidence = evidence
      @requirement = evidence.authorization_requirement
      @pa = @requirement.prior_authorization
      @actor = actor
      @action = action.to_s
    end

    def call
      raise Error, "This prior authorization can no longer be edited." unless @pa.editable?
      raise Error, "Unknown evidence action." unless ACTIONS.include?(@action)

      AuthorizationEvidence.transaction do
        if @action == "verify"
          @evidence.update!(verified_by: @actor, verified_at: Time.current, rejected_by: nil, rejected_at: nil)
        else
          @evidence.update!(rejected_by: @actor, rejected_at: Time.current, verified_by: nil, verified_at: nil)
        end

        WorkflowEvent.record!(subject: @pa, event_type: "evidence_#{@action == 'verify' ? 'verified' : 'rejected'}",
                              actor: @actor, payload: { evidence_id: @evidence.id, requirement_id: @requirement.id })

        @requirement.evidence.reset
        if @requirement.status == "met" && @requirement.verified_evidence.empty?
          @requirement.update!(status: "pending", reviewed_by: @actor, reviewed_at: Time.current)
          WorkflowEvent.record!(subject: @pa, event_type: "requirement_reviewed", actor: @actor,
                                payload: { requirement_id: @requirement.id, from: "met", to: "pending", reason: "evidence rejected" })
        end

        Tasks::SyncService.call(@pa, actor: @actor)
        StatusSyncService.call(@pa, actor: @actor)
      end
      @evidence
    end
  end
end
