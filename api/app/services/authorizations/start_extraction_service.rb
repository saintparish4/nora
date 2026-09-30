module Authorizations
  # Marks extraction as running and queues the job, refusing a second run
  # while one is in flight.
  class StartExtractionService
    def self.call(...) = new(...).call

    def initialize(prior_authorization, actor:)
      @pa = prior_authorization
      @actor = actor
    end

    def call
      raise Error, "This prior authorization can no longer be edited." unless @pa.preparing?
      raise Error, "Evidence extraction is already running." if @pa.extraction_status == "running"

      @pa.update!(extraction_status: "running", extraction_error: nil)
      WorkflowEvent.record!(subject: @pa, event_type: "extraction_started", actor: @actor)
      ExtractEvidenceJob.perform_later(@pa.id, @actor&.id)
      @pa
    end
  end
end
