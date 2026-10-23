module RequestForm
  # Records a person's answer to one of the plan's questions: the prescriber's
  # office's reply to a question Nora could not answer ("manual"), or a
  # correction to Nora's answer ("override"). Giving Nora's own answer back,
  # or no answer, clears it. Each change is on the request's timeline.
  class RecordAnswer
    def self.call(...) = new(...).call

    # @param codes [Array<String>, nil] the chosen answer codes, for a choice
    # @param value [String, Integer, nil] the number, for a number question
    def initialize(prior_authorization, actor:, link_id:, codes: nil, value: nil, note: nil, source: Fhir.source)
      @pa = prior_authorization
      @actor = actor
      @link_id = link_id.to_s
      @codes = Array(codes).map(&:to_s).compact_blank.uniq.sort
      @value = value.to_s.strip.presence
      @note = note.to_s.strip.presence
      @source = source
    end

    # @return [FormAnswer, nil] the stored answer, nil once cleared
    def call
      raise Authorizations::Error, "This request has been submitted; its answers are on the record." unless @pa.editable?

      set = QuestionSet.for(payer: @pa.policy_template.payer&.name, item: @pa.item_name) or
        raise Authorizations::Error, "This request has no question set."
      item = set.items.find { |i| i.link_id == @link_id } or raise Authorizations::Error, "No question #{@link_id} on this form."
      answer = answer_for(item)
      existing = @pa.form_answers.find_by(link_id: @link_id)
      auto = auto_answer(set)

      FormAnswer.transaction do
        if answer.nil? || answer == auto
          existing&.destroy!
          record_event(cleared: true) if existing
          next nil
        end

        form_answer = existing || @pa.form_answers.build(link_id: @link_id)
        form_answer.update!(value: answer, origin: auto.nil? ? "manual" : "override", note: @note, recorded_by: @actor)
        record_event(origin: form_answer.origin)
        form_answer
      end
    end

    private

    def answer_for(item)
      if item.type == "integer"
        return nil if @value.nil?
        raise Authorizations::Error, "Give a whole number." unless @value.match?(/\A\d+\z/)

        return { "value" => @value.to_i.to_s }
      end
      return nil if @codes.empty?

      unknown = @codes - item.options.map { |o| o[:code] }
      raise Authorizations::Error, "Not a choice for this question: #{unknown.join(', ')}" if unknown.any?
      raise Authorizations::Error, "Choose one answer." if @codes.size > 1 && !item.repeats

      { "codes" => @codes }
    end

    # What Nora's CQL answers, in the same shape, or nil.
    def auto_answer(set)
      fhir_id = @pa.patient.fhir_id or return nil
      chart = Fhir::Chart.new(source: @source, patient_id: fhir_id)
      found = ClinicalAnswers.call(@pa, chart: chart, question_set: set, staff: {}).find { |a| a.link_id == @link_id }
      return nil unless found&.status == ClinicalAnswers::ANSWERED

      found.answer[:codes] ? { "codes" => found.answer[:codes].sort } : { "value" => found.answer[:display] }
    rescue Fhir::Error, Cql::Error
      nil
    end

    def record_event(payload)
      WorkflowEvent.record!(subject: @pa, event_type: "form_answer_recorded", actor: @actor, payload: { link_id: @link_id }.merge(payload))
    end
  end
end
