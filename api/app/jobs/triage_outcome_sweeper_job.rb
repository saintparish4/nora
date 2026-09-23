# Records the outcome that no callback can fire for: the recommendation that
# never became a booking.
#
# Without this, "not booked" and "booked but nothing has happened yet" are the
# same null, and the follow-through rate cannot be computed at all. A
# recommendation the patient declined to act on is a real signal — arguably the
# most interesting one, since it is where triage failed to persuade.
class TriageOutcomeSweeperJob < ApplicationJob
  queue_as :default

  # Give the attribution window room to close before calling it a miss, so a
  # patient who books 23 hours later is not first marked not_booked and then
  # contradicted.
  GRACE = 1.hour

  def perform
    cutoff = RiskAssessment::BOOKING_ATTRIBUTION_WINDOW.ago - GRACE

    stale = RiskAssessment.awaiting_outcome
                          .where(appointment_id: nil)
                          .where(created_at: ...cutoff)

    swept = 0
    stale.find_each do |assessment|
      swept += 1 if assessment.record_outcome!("not_booked")
    rescue StandardError => e
      Rails.logger.error(
        "[OUTCOME_SWEEP_FAILURE] assessment=#{assessment.id} error=#{e.class}: #{e.message}"
      )
      Sentry.capture_exception(e) if defined?(Sentry)
    end

    Rails.logger.info("[OUTCOME_SWEEP] marked=#{swept} cutoff=#{cutoff.iso8601}")
    swept
  end
end
