# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Demo practice' do
  def request_for(organization, mrn)
    organization.patients.find_by!(mrn: mrn).prior_authorizations.sole
  end

  def requirement(prior_authorization, position)
    prior_authorization.requirements.joins(:policy_criterion).find_by!(policy_criteria: { position: position })
  end

  describe Demo::Practice do
    it 'is on everywhere but production' do
      expect(described_class).to be_enabled
    end

    it 'needs DEMO_PRACTICE=true in production' do
      allow(Rails.env).to receive(:production?).and_return(true)
      expect(described_class).not_to be_enabled

      stub_const('ENV', ENV.to_h.merge('DEMO_PRACTICE' => 'true'))
      expect(described_class).to be_enabled
    end

    it 'has nobody to sign in as before the practice is seeded' do
      expect(described_class.user_for('staff')).to be_nil
      expect(described_class.featured_request).to be_nil
    end

    it 'offers the medical assistant and the clinician, never the admin' do
      seed_demo_practice

      expect(described_class.user_for('').email).to eq('ma@nora.com')
      expect(described_class.user_for('clinician').email).to eq('clinician@nora.com')
      expect(described_class.user_for('admin')).to be_nil
      expect(described_class.user_for('owner')).to be_nil
    end

    it 'ignores an account with a demo email that sits in another practice' do
      create(:user, email: 'ma@nora.com')
      create(:organization, demo: true)

      expect(described_class.user_for('staff')).to be_nil
    end
  end

  describe 'the seeded requests' do
    let!(:organization) { seed_demo_practice }

    it 'leaves one request at each stage a visitor should see' do
      statuses = organization.prior_authorizations.to_h { |pa| [ pa.patient.mrn, pa.status ] }

      expect(statuses).to eq(
        'DEMO-1005' => 'approved_by_payer',
        'DEMO-1001' => 'needs_clarification',
        'DEMO-1004' => 'ready_for_review',
        'DEMO-1002' => 'gathering'
      )
    end

    it 'leaves one patient with no request, to start one for' do
      expect(organization.patients.find_by!(mrn: 'DEMO-1003').prior_authorizations).to be_empty
    end

    it 'features the request blocked on a prescription with no documented outcome' do
      featured = Demo::Practice.featured_request
      second_trial = requirement(featured, 7)

      expect(featured).to eq(request_for(organization, 'DEMO-1001'))
      expect(second_trial.status).to eq('missing')
      expect(second_trial.note).to include('A fill alone does not document a second trial')
      # The fill has no outcome, so the rule pass never offers it as evidence.
      expect(second_trial.evidence).to be_empty
      expect(requirement(featured, 6).status).to eq('missing')
    end

    it 'opens a task for the ordering clinician on each missing requirement' do
      featured = Demo::Practice.featured_request
      tasks = Task.open.where(subject: featured)

      expect(tasks.map(&:source)).to contain_exactly(requirement(featured, 6), requirement(featured, 7))
      expect(tasks.map { |task| task.assignee.email }.uniq).to eq([ 'clinician@nora.com' ])
    end

    it 'never marks a requirement met without evidence a person verified' do
      met = AuthorizationRequirement.where(prior_authorization: organization.prior_authorizations, status: 'met')

      expect(met).not_to be_empty
      expect(met.map { |req| req.verified_evidence.size }).to all(be_positive)
    end

    it 'never passes anything off as found by the model' do
      evidence = AuthorizationEvidence.where(authorization_requirement: AuthorizationRequirement.where(prior_authorization: organization.prior_authorizations))

      expect(evidence.distinct.pluck(:extracted_by)).to eq([ 'rule' ])
    end

    it 'carries a current approval and a packet for the decided request' do
      decided = request_for(organization, 'DEMO-1005')

      expect(decided.latest_approval.approved_by.email).to eq('clinician@nora.com')
      expect(decided).to be_approval_current
      expect(Authorizations::PacketService.call(decided)).to start_with('%PDF')
    end

    it 'dates the history in the past and in order' do
      decided = request_for(organization, 'DEMO-1005')
      events = WorkflowEvent.where(organization: organization)

      expect(events.maximum(:created_at)).to be <= Time.current
      expect(events.where(actor_id: nil)).to be_empty
      expect([ decided.created_at, decided.latest_approval.created_at, decided.submitted_at, decided.decided_at ])
        .to eq([ decided.created_at, decided.latest_approval.created_at, decided.submitted_at, decided.decided_at ].sort)
      expect(decided.submitted_at.to_date).to be > decided.created_at.to_date
    end

    it 'adds nothing when the seeds run again' do
      counts = -> { [ PriorAuthorization, WorkflowEvent, AuthorizationEvidence, ChartDocument, Patient, User ].map(&:count) }

      expect { seed_demo_practice }.not_to(change { counts.call })
    end
  end

  describe Demo::ResetService do
    it 'does nothing when there is no demo practice' do
      other = create_prior_authorization

      expect(described_class.call).to be_nil
      expect(other.reload).to be_present
    end

    it 'undoes what a visitor did and restores the seeded requests' do
      organization = seed_demo_practice
      staff = Demo::Practice.user_for('staff')
      visitor_patient = create(:patient, organization: organization, mrn: 'VISITOR-1')
      create(:patient_coverage, patient: visitor_patient)
      create(:chart_document, patient: visitor_patient, uploaded_by: staff)
      create(:user, :admin, organization: organization, email: 'visitor@example.com')
      Authorizations::ManualTransitionService.call(Demo::Practice.featured_request, actor: staff, to: 'cancelled')
      staff.update!(first_name: 'Changed')

      reset_demo_practice

      expect(organization.patients.pluck(:mrn)).to match_array(%w[DEMO-1001 DEMO-1002 DEMO-1003 DEMO-1004 DEMO-1005])
      expect(organization.users.pluck(:email)).to match_array(Demo::Practice::ACCOUNTS.values)
      expect(staff.reload.first_name).to eq('Jordan')
      expect(organization.prior_authorizations.pluck(:status))
        .to match_array(%w[approved_by_payer needs_clarification ready_for_review gathering])
      expect(Demo::Practice.featured_request.status).to eq('needs_clarification')
    end

    it 'leaves every other practice exactly as it was' do
      seed_demo_practice
      other = create_prior_authorization
      Authorizations::EvidenceExtractionService.call(other, actor: other.created_by, model_pass: false)
      counts = lambda do
        org = other.organization
        [ org.users.count, org.patients.count, org.chart_documents.count, org.prior_authorizations.count,
          org.workflow_events.count, org.tasks.count, other.requirements.count, other.evidence.count ]
      end

      expect { reset_demo_practice }.not_to(change { counts.call })
      expect(counts.call).to all(be_positive)
    end
  end
end
