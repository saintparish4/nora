# A persisted snapshot of one triage analysis: what care level the assistant
# landed on and why. Written once per completed analysis so a patient's risk can
# be read longitudinally instead of only in the moment.
#
# Both associations are required by the schema, which means an assessment only
# exists for a signed-in patient's conversation. Guest chats are analyzed but
# not recorded — there is no account to attach the history to.
class RiskAssessment < ApplicationRecord
  belongs_to :conversation
  belongs_to :user

  # Mirrors Triage::SymptomAnalyzerService::URGENCY_LEVELS.
  CARE_LEVELS = %w[routine urgent emergency].freeze

  validates :care_level, presence: true, inclusion: { in: CARE_LEVELS }
  validates :confidence,
            numericality: { only_integer: true, in: 0..100 },
            allow_nil: true

  scope :recent_first, -> { order(created_at: :desc) }
  scope :escalated, -> { where(care_level: %w[urgent emergency]) }

  def as_summary_json
    as_json(only: [ :id, :care_level, :confidence, :reasoning, :created_at ]).merge(
      "red_flags" => red_flags || [],
      "recommended_specialties" => recommended_specialties || [],
      "self_care_options" => self_care_options || [],
      "escalation_triggers" => escalation_triggers || []
    )
  end
end
