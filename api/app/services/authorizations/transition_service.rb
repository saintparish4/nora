module Authorizations
  # The only door through which a prior authorization changes status. Checks
  # the transition table, stamps timestamps, and records a WorkflowEvent.
  class TransitionService
    def self.call(...) = new(...).call

    # @param attributes [Hash] extra columns to write with the status change,
    #   such as payer_reference on submission
    def initialize(prior_authorization, to:, actor:, payload: {}, attributes: {})
      @pa = prior_authorization
      @to = to.to_s
      @actor = actor
      @payload = payload
      @attributes = attributes
    end

    def call
      from = @pa.status
      return @pa if from == @to

      unless @pa.can_transition_to?(@to)
        raise Error, "A prior authorization that is #{from.humanize(capitalize: false)} cannot move to #{@to.humanize(capitalize: false)}."
      end

      PriorAuthorization.transaction do
        @pa.assign_attributes(@attributes)
        @pa.status = @to
        @pa.submitted_at = Time.current if @to == "submitted"
        @pa.decided_at = Time.current if %w[approved_by_payer denied].include?(@to)
        @pa.transitioning = true
        @pa.save!
        WorkflowEvent.record!(subject: @pa, event_type: "status_changed", actor: @actor,
                              from_status: from, to_status: @to, payload: @payload)
        Tasks::SyncService.call(@pa, actor: @actor) if %w[cancelled closed].include?(@to)
      end
      @pa
    ensure
      @pa.transitioning = false
    end
  end
end
