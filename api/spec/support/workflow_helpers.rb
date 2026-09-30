# frozen_string_literal: true

# Builds a prior authorization the way the app does, through CreateService.
module WorkflowSpecHelpers
  def create_prior_authorization(organization: create(:organization), item_name: 'Wegovy', with_document: true)
    staff = create(:user, organization: organization)
    clinician = create(:user, :clinician, organization: organization)
    patient = create(:patient, organization: organization)
    coverage = create(:patient_coverage, patient: patient)
    PolicyTemplate.find_by(item_name: item_name) || create(:policy_template, item_name: item_name)
    create(:chart_document, patient: patient, uploaded_by: staff) if with_document

    Authorizations::CreateService.call(
      organization: organization, actor: staff, patient: patient, coverage: coverage,
      item_name: item_name, requested_by: clinician, assigned_to: staff
    )
  end

  # Verify every live evidence row and mark each requirement met.
  def resolve_all_requirements!(pa, actor:)
    pa.requirements.reload.each do |req|
      doc = pa.patient.chart_documents.first
      if req.evidence.reload.none?
        quote = doc.body.lines.find { |l| l.include?('BMI') }.strip
        Authorizations::AddEvidenceService.call(req, actor: actor, document: doc, quote: quote)
      end
      req.evidence.reload.each do |ev|
        Authorizations::EvidenceReviewService.call(ev, actor: actor, action: 'verify') unless ev.verified?
      end
      Authorizations::RequirementReviewService.call(req.reload, actor: actor, status: 'met')
    end
    pa.reload
  end
end

RSpec.configure do |config|
  config.include WorkflowSpecHelpers
end
