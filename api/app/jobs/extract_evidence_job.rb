# Runs evidence extraction off the request cycle. Any unexpected failure is
# recorded on the prior authorization so the console never shows a run that
# is "running" forever.
class ExtractEvidenceJob < ApplicationJob
  queue_as :default

  def perform(prior_authorization_id, actor_id = nil)
    pa = PriorAuthorization.find(prior_authorization_id)
    actor = actor_id && User.find_by(id: actor_id)
    Authorizations::EvidenceExtractionService.call(pa, actor: actor)
  rescue ActiveRecord::RecordNotFound
    nil
  rescue StandardError => e
    pa&.update_columns(extraction_status: "failed", extraction_error: "Extraction failed unexpectedly. Try again.", updated_at: Time.current)
    raise e
  end
end
