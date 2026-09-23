# Closes the half of the triage feedback loop that was missing.
#
# Before this, a risk_assessment recorded only what the assistant predicted.
# A prediction with no outcome is not a feedback loop, so nothing could be
# said about whether triage routes patients correctly.
class AddOutcomeTrackingToRiskAssessments < ActiveRecord::Migration[8.1]
  def change
    # Assessments were conversation-only, which meant the two single-shot
    # endpoints (/analyze-symptoms, /quick-booking/analyze) recorded nothing at
    # all. A signed-in patient using those paths is just as worth tracking.
    change_column_null :risk_assessments, :conversation_id, true

    # The booking this assessment led to, when one followed. Null covers both
    # "not booked yet" and "never booked" — the latter is itself a signal.
    add_reference :risk_assessments, :appointment,
                  null: true, foreign_key: true, index: true

    # What actually happened, captured from the appointment lifecycle.
    # attended / no_show / cancelled / not_booked
    add_column :risk_assessments, :outcome, :string
    add_column :risk_assessments, :outcome_recorded_at, :datetime

    # The care level the visit turned out to warrant, when a provider tells us.
    # This is the column concordance is actually measured against; it stays
    # null until there is a provider-facing way to record it.
    add_column :risk_assessments, :actual_care_level, :string

    add_index :risk_assessments, :outcome
    add_index :risk_assessments, :actual_care_level
  end
end
