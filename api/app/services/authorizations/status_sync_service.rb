module Authorizations
  # Moves a prior authorization that is still being prepared to the status its
  # requirements imply, and pulls an approved one back when its content no
  # longer matches what was approved.
  #
  #   every requirement met or not applicable      -> ready_for_review
  #   something missing or unclear, none pending   -> needs_clarification
  #   otherwise (evidence awaiting a person)       -> gathering
  class StatusSyncService
    def self.call(...) = new(...).call

    def initialize(prior_authorization, actor:)
      @pa = prior_authorization
      @actor = actor
    end

    def call
      @pa.requirements.reset
      return @pa unless @pa.editable? && @pa.status != "draft"

      if @pa.status == "approved"
        return @pa if @pa.approval_current?

        WorkflowEvent.record!(subject: @pa, event_type: "approval_invalidated", actor: @actor,
                              payload: { reason: "content changed after approval" })
      end

      target = derived_status
      TransitionService.call(@pa, to: target, actor: @actor, payload: { reason: "requirements changed" }) if target != @pa.status
      @pa
    end

    private

    def derived_status
      statuses = @pa.requirements.map(&:status)
      return "ready_for_review" if statuses.any? && statuses.all? { |s| AuthorizationRequirement::RESOLVED.include?(s) }
      return "needs_clarification" if statuses.none?("pending") && statuses.intersect?(%w[missing unclear])

      "gathering"
    end
  end
end
