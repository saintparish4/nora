module Authorizations
  # Opens a prior authorization for a patient, coverage, and item. Resolves the
  # payer's policy (falling back to the generic baseline) and creates one
  # requirement per criterion.
  class CreateService
    def self.call(...) = new(...).call

    def initialize(organization:, actor:, patient:, coverage:, item_name:, requested_by:, assigned_to: nil, item_code: nil)
      @organization = organization
      @actor = actor
      @patient = patient
      @coverage = coverage
      @item_name = item_name.to_s.strip
      @item_code = item_code
      @requested_by = requested_by
      @assigned_to = assigned_to
    end

    def call
      raise Error, "Choose the item to authorize." if @item_name.blank?
      raise Error, "That coverage does not belong to this patient." unless @coverage.patient_id == @patient.id

      template = PolicyTemplate.resolve(item_name: @item_name, payer: @coverage.insurance_plan.payer)
      raise Error, "Nora has no criteria for #{@item_name} yet." if template.nil? || template.criteria.empty?

      PriorAuthorization.transaction do
        pa = PriorAuthorization.create!(
          organization: @organization,
          patient: @patient,
          patient_coverage: @coverage,
          policy_template: template,
          requested_by: @requested_by,
          assigned_to: @assigned_to,
          created_by: @actor,
          item_name: template.item_name,
          item_code: @item_code.presence || template.item_code
        )
        template.criteria.each do |criterion|
          pa.requirements.create!(policy_criterion: criterion)
        end
        WorkflowEvent.record!(subject: pa, event_type: "created", actor: @actor, to_status: "draft",
                              payload: { policy_template_id: template.id, generic_policy: template.generic? })
        TransitionService.call(pa, to: "gathering", actor: @actor)
      end
    end
  end
end
