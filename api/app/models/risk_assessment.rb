# A persisted snapshot of one triage analysis: what care level the assistant
# landed on, how sure it was, and — once it is known — what actually happened.
#
# The pair is the point. A prediction on its own says nothing about whether
# triage routes patients correctly; a prediction next to an outcome is the only
# thing here that compounds.
class RiskAssessment < ApplicationRecord
  # Guest chats and the single-shot endpoints have no conversation, so an
  # assessment can exist without one. It can never exist without a user: there
  # would be no account to attach the history to.
  belongs_to :conversation, optional: true
  belongs_to :user
  belongs_to :appointment, optional: true

  # Mirrors Triage::SymptomAnalyzerService::URGENCY_LEVELS.
  CARE_LEVELS = %w[routine urgent emergency].freeze

  # What became of the recommendation.
  #   attended   — the patient booked and was seen
  #   no_show    — booked and did not turn up
  #   cancelled  — booked and cancelled
  #   not_booked — a recommendation that never became an appointment
  OUTCOMES = %w[attended no_show cancelled not_booked].freeze

  validates :care_level, presence: true, inclusion: { in: CARE_LEVELS }
  validates :actual_care_level, inclusion: { in: CARE_LEVELS }, allow_nil: true
  validates :outcome, inclusion: { in: OUTCOMES }, allow_nil: true
  validates :confidence,
            numericality: { only_integer: true, in: 0..100 },
            allow_nil: true

  scope :recent_first, -> { order(created_at: :desc) }
  scope :escalated, -> { where(care_level: %w[urgent emergency]) }
  scope :with_outcome, -> { where.not(outcome: nil) }
  scope :awaiting_outcome, -> { where(outcome: nil) }
  # Only rows a clinician has graded can speak to routing correctness.
  scope :scorable, -> { where.not(actual_care_level: nil) }

  # How long after a recommendation a booking is still credited to it. Long
  # enough that a patient can think it over, short enough that an unrelated
  # booking next week is not miscredited to this analysis.
  BOOKING_ATTRIBUTION_WINDOW = 24.hours

  # Links a new booking to the recommendation that most plausibly produced it.
  # Best-effort and non-fatal: attribution is reporting, and a patient booking
  # an appointment must never fail because of it.
  def self.attach_booking!(user:, appointment:)
    return nil if user.nil? || appointment.nil?

    assessment = where(user: user, appointment: nil)
                   .where(created_at: BOOKING_ATTRIBUTION_WINDOW.ago..)
                   .recent_first
                   .first
    return nil if assessment.nil?

    assessment.update!(appointment: appointment)
    assessment
  rescue StandardError => e
    Rails.logger.error(
      "[BOOKING_ATTRIBUTION_FAILURE] user=#{user&.id} appointment=#{appointment&.id} " \
      "error=#{e.class}: #{e.message}"
    )
    Sentry.capture_exception(e) if defined?(Sentry)
    nil
  end

  # Record what happened. Idempotent by design: the appointment lifecycle can
  # fire more than once (confirmed, then completed) and the latest word wins.
  def record_outcome!(outcome, at: Time.current)
    return false unless OUTCOMES.include?(outcome.to_s)

    update!(outcome: outcome.to_s, outcome_recorded_at: at)
  end

  # nil when no clinician has graded this assessment — which is most of them,
  # and is deliberately not the same as "concordant".
  def concordant?
    return nil if actual_care_level.blank?

    actual_care_level == care_level
  end

  # Negative means the assistant sent the patient somewhere less acute than
  # they needed. That direction is the one that can end the company, so it is
  # named rather than folded into a single "wrong" count.
  def triage_delta
    return nil if actual_care_level.blank?

    CARE_LEVELS.index(care_level) - CARE_LEVELS.index(actual_care_level)
  end

  def under_triaged?
    delta = triage_delta
    delta.present? && delta.negative?
  end

  def as_summary_json
    as_json(only: [ :id, :care_level, :confidence, :reasoning, :outcome, :actual_care_level, :created_at ]).merge(
      "red_flags" => red_flags || [],
      "recommended_specialties" => recommended_specialties || [],
      "self_care_options" => self_care_options || [],
      "escalation_triggers" => escalation_triggers || [],
      "concordant" => concordant?
    )
  end
end
