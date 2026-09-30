module Authorizations
  # A person cites chart text the extraction missed. The quote must exist in
  # the document; the person adding it has verified it by definition.
  class AddEvidenceService
    def self.call(...) = new(...).call

    def initialize(requirement, actor:, document:, quote:)
      @requirement = requirement
      @pa = requirement.prior_authorization
      @actor = actor
      @document = document
      @quote = quote.to_s.strip
    end

    def call
      raise Error, "This prior authorization can no longer be edited." unless @pa.editable?
      raise Error, "Paste the exact text from the document." if @quote.blank?
      raise Error, "That document belongs to a different patient." unless @document.patient_id == @pa.patient_id

      range = QuoteLocator.locate(@document.body, @quote)
      raise Error, "That text does not appear in #{@document.title}. Copy it exactly from the document." if range.nil?

      AuthorizationEvidence.transaction do
        evidence = @requirement.evidence.create!(
          chart_document: @document,
          excerpt: @document.body[range[0]...range[1]],
          start_offset: range[0],
          end_offset: range[1],
          confidence: nil,
          extracted_by: "human",
          verified_by: @actor,
          verified_at: Time.current
        )
        WorkflowEvent.record!(subject: @pa, event_type: "evidence_added", actor: @actor,
                              payload: { evidence_id: evidence.id, requirement_id: @requirement.id, extracted_by: "human" })
        StatusSyncService.call(@pa, actor: @actor)
        evidence
      end
    end
  end
end
