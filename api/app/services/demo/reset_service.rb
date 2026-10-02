module Demo
  # Empties the demo practice so the seeds can rebuild it from scratch.
  #
  # The demo is shared and public, so anything a visitor did is still there
  # for the next one. This removes it all: requests with their evidence,
  # approvals, events and tasks, every patient and chart document, and any
  # account beyond the seeded ones. It deletes rows directly because events
  # and approvals are append-only to the application, and it only ever touches
  # the practice flagged `demo`.
  class ResetService
    def self.call(...) = new(...).call

    def call
      organization = Practice.organization
      return if organization.nil?

      Organization.transaction do
        delete_requests(organization)
        delete_chart(organization)
        delete_visitor_accounts(organization)
      end
      organization
    end

    private

    # Every relation below is built from the model, not from the practice's
    # associations: `delete_all` on a has_many nullifies the foreign key
    # instead of deleting the row.

    def delete_requests(organization)
      requests = PriorAuthorization.where(organization_id: organization.id)
      requirements = AuthorizationRequirement.where(prior_authorization_id: requests.select(:id))

      AuthorizationEvidence.where(authorization_requirement_id: requirements.select(:id)).delete_all
      requirements.delete_all
      Approval.where(approvable_type: "PriorAuthorization", approvable_id: requests.select(:id)).delete_all
      WorkflowEvent.where(organization_id: organization.id).delete_all
      Task.where(organization_id: organization.id).delete_all
      requests.delete_all
    end

    def delete_chart(organization)
      patients = Patient.where(organization_id: organization.id)

      ChartDocument.where(organization_id: organization.id).delete_all
      PatientCoverage.where(patient_id: patients.select(:id)).delete_all
      patients.delete_all
    end

    # Accounts beyond the seeded ones. The seeds restore the seeded accounts'
    # names, roles, and passwords.
    def delete_visitor_accounts(organization)
      extras = User.where(organization_id: organization.id).where.not(email: Practice::ACCOUNTS.values)

      RefreshToken.where(user_id: extras.select(:id)).delete_all
      extras.delete_all
    end
  end
end
