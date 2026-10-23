module Authorizations
  # The staff member's final check and submission. Staff submit under the
  # prescriber's name, the way practices do on CoverMyMeds, so the check
  # records exactly what went out (a content digest), who submitted it, and
  # the prescriber it was submitted on behalf of. No clinician sign-off is
  # needed; every requirement must be met or marked not applicable.
  class SubmitService
    def self.call(...) = new(...).call

    def initialize(prior_authorization, actor:, payer_reference: nil, prep_minutes_reported: nil)
      @pa = prior_authorization
      @actor = actor
      @payer_reference = payer_reference
      @prep_minutes = prep_minutes_reported
    end

    def call
      raise Error, "Only a request that is ready to submit can be submitted." unless %w[ready_for_review approved].include?(@pa.status)

      @pa.requirements.reset
      raise Error, "Every requirement must be met or marked not applicable first." unless @pa.all_requirements_resolved?

      Approval.transaction do
        digest = @pa.content_digest
        Approval.create!(approvable: @pa, approved_by: @actor, content_digest: digest)
        WorkflowEvent.record!(subject: @pa, event_type: "final_check", actor: @actor,
                              payload: { content_digest: digest, on_behalf_of_id: @pa.requested_by_id })
        attributes = {}
        attributes[:payer_reference] = @payer_reference if @payer_reference.present?
        attributes[:prep_minutes_reported] = @prep_minutes if @prep_minutes.present?
        TransitionService.call(@pa, to: "submitted", actor: @actor, attributes: attributes)
      end
    rescue ActiveRecord::RecordInvalid => e
      raise Error, e.record.errors.full_messages.to_sentence
    end
  end
end
