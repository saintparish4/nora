module Demo
  # The shared synthetic practice behind the public demo: whether this server
  # offers one, who its people are, and which request a visitor sees first.
  #
  # It is always available outside production. Production has to opt in with
  # DEMO_PRACTICE=true, because a deployment serving real practices should not
  # carry accounts that anyone can sign in to.
  module Practice
    NAME = "Demo Family Medicine".freeze
    # One seeded account per role.
    ACCOUNTS = {
      "admin" => "demo@nora.com",
      "clinician" => "clinician@nora.com",
      "staff" => "ma@nora.com"
    }.freeze
    # Roles a visitor can sign in as with one click. Admin is left out: the
    # demo practice's staff and settings are locked anyway.
    SIGN_IN_ROLES = %w[staff clinician].freeze

    module_function

    def enabled?
      !Rails.env.production? || ENV["DEMO_PRACTICE"] == "true"
    end

    def organization
      Organization.find_by(demo: true)
    end

    # @return [User, nil] the demo account for a role, or nil when the demo is
    #   off, unseeded, or the role is not one a visitor may use
    def user_for(role)
      role = role.presence || SIGN_IN_ROLES.first
      return nil unless enabled? && SIGN_IN_ROLES.include?(role)

      organization&.users&.find_by(email: ACCOUNTS.fetch(role))
    end

    # The request that shows the most of Nora at once: evidence quoted from the
    # chart, a quote a person rejected, and a gap waiting on the clinician.
    def featured_request
      requests = organization&.prior_authorizations
      return nil if requests.nil?

      requests.where(status: "needs_clarification").order(:id).first || requests.open.order(updated_at: :desc).first
    end
  end
end
