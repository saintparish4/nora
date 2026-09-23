module Triage
  # Turns a Triage::SymptomAnalyzerService result into a persisted
  # RiskAssessment row.
  #
  # Call this after every completed analysis. It is deliberately forgiving: a
  # failed write must not cost the patient their recommendation, so the caller
  # gets nil instead of an exception. The row is an audit and reporting
  # artifact, not part of the response the patient is waiting on.
  class RiskAssessmentService
    # @param analysis     [Hash] the hash returned by SymptomAnalyzerService#analyze
    # @param user         [User, nil] the signed-in patient, if any
    # @param conversation [Conversation, nil] present for the chat flow only;
    #   the single-shot endpoints have no conversation to attach to
    # @param appointment  [Appointment, nil] set when the booking is already known
    # @return [RiskAssessment, nil] nil for a guest (no account to attach the
    #   history to), or when the write failed
    def self.record(analysis:, user: nil, conversation: nil, appointment: nil)
      new(
        analysis: analysis,
        user: user,
        conversation: conversation,
        appointment: appointment
      ).record
    end

    def initialize(analysis:, user: nil, conversation: nil, appointment: nil)
      @analysis = analysis || {}
      @conversation = conversation
      # The chat flow passes only a conversation; fall back to its owner so
      # both call styles work.
      @user = user || conversation&.user
      @appointment = appointment
    end

    def record
      return nil if @user.nil?

      RiskAssessment.create!(
        conversation: @conversation,
        user: @user,
        appointment: @appointment,
        care_level: care_level,
        confidence: @analysis[:confidence],
        reasoning: @analysis[:reasoning],
        red_flags: Array(@analysis[:red_flags]),
        recommended_specialties: recommended_specialties,
        # The analyzer does not produce these two yet; the columns exist for a
        # richer prompt later. Left at their schema defaults on purpose.
        self_care_options: [],
        escalation_triggers: []
      )
    rescue StandardError => e
      Rails.logger.error(
        "[RISK_ASSESSMENT_FAILURE] user=#{@user&.id} conversation=#{@conversation&.id} " \
        "error=#{e.class}: #{e.message}"
      )
      Sentry.capture_exception(e) if defined?(Sentry)
      nil
    end

    private

    # Urgency is the analyzer's word for the same idea the column calls
    # care_level. Anything unrecognized escalates rather than defaulting down —
    # the stored history has to agree with what the patient was actually told,
    # and the analyzer's own failsafe escalates too. Recording "routine" for an
    # analysis we could not read would poison the concordance data with the one
    # error that matters most.
    def care_level
      urgency = @analysis[:urgency].to_s
      return urgency if RiskAssessment::CARE_LEVELS.include?(urgency)

      Rails.logger.warn(
        "[RISK_ASSESSMENT_FAILSAFE] user=#{@user&.id} conversation=#{@conversation&.id} " \
        "unrecognized urgency=#{urgency.inspect}, recording " \
        "#{Triage::SymptomAnalyzerService::FAILSAFE_URGENCY}"
      )
      Triage::SymptomAnalyzerService::FAILSAFE_URGENCY
    end

    def recommended_specialties
      [ @analysis[:specialty_name], @analysis[:specialty] ].compact_blank.uniq.first(1)
    end
  end
end
