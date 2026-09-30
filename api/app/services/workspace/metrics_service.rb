module Workspace
  # The numbers a pilot has to produce: how long preparation takes, and what
  # happens to requests once submitted. Elapsed time is wall-clock time from
  # creation to first approval, which overstates effort; staff-reported minutes
  # are the better measure and are shown beside it.
  class MetricsService
    WINDOW = 90.days

    def self.call(...) = new(...).call

    def initialize(organization:, since: WINDOW.ago)
      @organization = organization
      @since = since
    end

    def call
      pas = @organization.prior_authorizations.where(created_at: @since..)
      first_approvals = Approval.where(approvable_type: "PriorAuthorization", approvable_id: pas.select(:id))
                                .group(:approvable_id).minimum(:created_at)
      created = pas.where(id: first_approvals.keys).pluck(:id, :created_at).to_h
      elapsed = first_approvals.map { |id, approved_at| ((approved_at - created[id]) / 60.0).round(1) }
      reported = pas.where.not(prep_minutes_reported: nil).pluck(:prep_minutes_reported)

      {
        window_days: ((Time.current - @since) / 1.day).round,
        requests_created: pas.count,
        requests_approved: first_approvals.size,
        median_minutes_to_approval: median(elapsed),
        median_reported_prep_minutes: median(reported),
        reported_prep_count: reported.size,
        submitted: pas.where.not(submitted_at: nil).count,
        payer_approved: reached(pas, "approved_by_payer"),
        payer_denied: reached(pas, "denied")
      }
    end

    private

    # Requests that ever reached a status, so a later close or appeal still counts.
    def reached(pas, status)
      pas.joins(:workflow_events).where(workflow_events: { to_status: status }).distinct.count
    end

    def median(values)
      return nil if values.empty?

      sorted = values.sort
      mid = sorted.size / 2
      value = sorted.size.odd? ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2.0
      value.round(1)
    end
  end
end
