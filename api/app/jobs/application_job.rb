class ApplicationJob < ActiveJob::Base
  # Retry on transient DB deadlocks with a short fixed backoff.
  retry_on ActiveRecord::Deadlocked, wait: 5.seconds, attempts: 3

  # Discard when the underlying record is gone — retrying would always fail.
  discard_on ActiveJob::DeserializationError

  # Retry on transient network timeouts using polynomial backoff (5 attempts
  # gives roughly 1s, 8s, 27s, 64s between tries before the job is discarded).
  retry_on Net::OpenTimeout, wait: :polynomially_longer, attempts: 5

  # Catch-all: report unexpected failures to Sentry so they surface in
  # the error dashboard rather than vanishing silently.
  rescue_from StandardError do |e|
    Sentry.capture_exception(e, extra: {
      job_class: self.class.name,
      job_id: job_id,
      queue_name: queue_name
    })
    raise e
  end
end
