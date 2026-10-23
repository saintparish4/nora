module Authorizations
  # Status changes a person makes from the console once the request has left
  # the practice: payer decisions, appeals, cancellation, closing. Submitting
  # goes through SubmitService.
  class ManualTransitionService
    def self.call(...) = new(...).call

    def initialize(prior_authorization, actor:, to:, payer_reference: nil, prep_minutes_reported: nil)
      @pa = prior_authorization
      @actor = actor
      @to = to.to_s
      @payer_reference = payer_reference
      @prep_minutes = prep_minutes_reported
    end

    def call
      raise Error, "That status is set by Nora, not by hand." unless PriorAuthorization::MANUAL_TARGETS.include?(@to)

      attributes = {}
      attributes[:payer_reference] = @payer_reference if @payer_reference.present?
      attributes[:prep_minutes_reported] = @prep_minutes if @prep_minutes.present?
      TransitionService.call(@pa, to: @to, actor: @actor, attributes: attributes)
    rescue ActiveRecord::RecordInvalid => e
      raise Error, e.record.errors.full_messages.to_sentence
    end
  end
end
