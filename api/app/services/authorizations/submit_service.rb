module Authorizations
  # The staff member's final check and submission. Staff submit under the
  # prescriber's name, the way practices do on CoverMyMeds, so the check
  # records exactly what went out (a content digest), who submitted it, and
  # the prescriber it was submitted on behalf of. No clinician sign-off is
  # needed; every requirement must be met or marked not applicable.
  #
  # The final check also keeps the request form as it stood: the fields and
  # the plan's questions as a QuestionnaireResponse, each answer with its
  # origin. That is the record of what staff entered on CoverMyMeds.
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
        form = submitted_form
        Approval.create!(approvable: @pa, approved_by: @actor, content_digest: digest, submitted_form: form)
        WorkflowEvent.record!(subject: @pa, event_type: "final_check", actor: @actor,
                              payload: { content_digest: digest, on_behalf_of_id: @pa.requested_by_id,
                                         form_digest: form && Digest::SHA256.hexdigest(JSON.generate(form)) })
        attributes = {}
        attributes[:payer_reference] = @payer_reference if @payer_reference.present?
        attributes[:prep_minutes_reported] = @prep_minutes if @prep_minutes.present?
        TransitionService.call(@pa, to: "submitted", actor: @actor, attributes: attributes)
      end
    rescue ActiveRecord::RecordInvalid => e
      raise Error, e.record.errors.full_messages.to_sentence
    end

    private

    # nil when the chart cannot be read: the request still goes, and the
    # record says the form was not captured.
    def submitted_form
      form = RequestForm::Builder.call(@pa)
      return nil unless form[:available]

      { fields: form[:fields].map { |f| f.slice(:section, :key, :label, :value) },
        questionnaire_response: form.dig(:questions, :questionnaire_response) }.as_json
    end
  end
end
