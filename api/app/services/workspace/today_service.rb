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

    # The groups, in the order a person should deal with them. Each request
    # appears once, under the first group it matches.
    ATTENTION_GROUPS = [
      [ "extraction_failed", "Evidence extraction failed", ->(_user) { "Retry extraction" },
        ->(pa) { pa.extraction_status == "failed" && PriorAuthorization::PREPARING.include?(pa.status) } ],
      [ "needs_clarification", "Documentation missing or unclear", ->(_user) { "Review" }, ->(pa) { pa.status == "needs_clarification" } ],
      [ "ready_to_submit", "Ready to submit", ->(_user) { "Final check and submit" },
        ->(pa) { %w[ready_for_review approved].include?(pa.status) } ],
      [ "denied", "Denied by payer", ->(_user) { "Appeal or close" }, ->(pa) { pa.status == "denied" } ]
    ].freeze

    # One query for every group, with everything as_api_json reads preloaded,
    # so the list costs the same number of queries however long it is.
    def needs_attention(pas)
      candidates = pas.includes(*PriorAuthorization::API_INCLUDES)
                      .where(status: %w[needs_clarification ready_for_review approved denied])
                      .or(pas.where(extraction_status: "failed", status: PriorAuthorization::PREPARING))
                      .order(updated_at: :desc).to_a

      items = ATTENTION_GROUPS.flat_map do |kind, reason, action, matches|
        candidates.select(&matches).map { |pa| item(pa, kind, reason, action.call(@user)) }
      end
      items.uniq { |i| i[:prior_authorization][:id] }.first(ATTENTION_LIMIT)
    end

    def item(pa, kind, reason, action)
      { kind: kind, reason: reason, action: action, prior_authorization: pa.as_api_json }
    end
  end
end
