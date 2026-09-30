module Authorizations
  # A person decides a requirement's status: met (needs verified evidence),
  # missing, unclear, not applicable (needs a note), or back to pending.
  class RequirementReviewService
    def self.call(...) = new(...).call

    def initialize(requirement, actor:, status:, note: nil)
      @requirement = requirement
      @pa = requirement.prior_authorization
      @actor = actor
      @status = status.to_s
      @note = note
    end

    def call
      raise Error, "This prior authorization can no longer be edited." unless @pa.editable?
      raise Error, "Unknown requirement status." unless AuthorizationRequirement::STATUSES.include?(@status)

      AuthorizationRequirement.transaction do
        from = @requirement.status
        @requirement.assign_attributes(status: @status, reviewed_by: @actor, reviewed_at: Time.current)
        @requirement.note = @note unless @note.nil?
        raise Error, @requirement.errors.full_messages.to_sentence unless @requirement.save

        WorkflowEvent.record!(subject: @pa, event_type: "requirement_reviewed", actor: @actor,
                              payload: { requirement_id: @requirement.id, from: from, to: @status })
        Tasks::SyncService.call(@pa, actor: @actor)
        StatusSyncService.call(@pa, actor: @actor)
      end
      @requirement
    end
  end
end
