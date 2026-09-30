module Workspace
  # The "Today" console: counts by status and the short list of things that
  # need a person now.
  class TodayService
    ATTENTION_LIMIT = 25

    def self.call(...) = new(...).call

    def initialize(organization:, user:)
      @organization = organization
      @user = user
    end

    def call
      pas = @organization.prior_authorizations
      {
        counts: {
          by_status: pas.group(:status).count,
          open_tasks: @organization.tasks.open.count,
          my_open_tasks: @organization.tasks.open.where(assignee: @user).count,
          overdue_tasks: @organization.tasks.open.where(due_on: ...Date.current).count
        },
        needs_attention: needs_attention(pas),
        my_tasks: @organization.tasks.open.where(assignee: @user).includes(:assignee, subject: :patient)
                               .order(Arel.sql("due_on IS NULL"), :due_on, :id).limit(ATTENTION_LIMIT).map(&:as_api_json)
      }
    end

    private

    def needs_attention(pas)
      items = []
      base = pas.includes(:patient, :requirements, :requested_by, :assigned_to, :patient_coverage, :policy_template, :approvals)
                .order(updated_at: :desc)

      base.where(extraction_status: "failed").where(status: PriorAuthorization::PREPARING).each do |pa|
        items << item(pa, "extraction_failed", "Evidence extraction failed", "Retry extraction")
      end
      base.where(status: "needs_clarification").each do |pa|
        items << item(pa, "needs_clarification", "Documentation missing or unclear", "Review")
      end
      base.where(status: "ready_for_review").each do |pa|
        action = @user.approver? ? "Approve" : "Awaiting clinician approval"
        items << item(pa, "ready_for_review", "Ready for approval", action)
      end
      base.where(status: "approved").each do |pa|
        items << item(pa, "ready_to_submit", "Approved, not yet submitted", "Download and submit")
      end
      base.where(status: "denied").each do |pa|
        items << item(pa, "denied", "Denied by payer", "Appeal or close")
      end

      items.uniq { |i| i[:prior_authorization][:id] }.first(ATTENTION_LIMIT)
    end

    def item(pa, kind, reason, action)
      { kind: kind, reason: reason, action: action, prior_authorization: pa.as_api_json }
    end
  end
end
