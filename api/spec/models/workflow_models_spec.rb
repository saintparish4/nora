# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Workflow models' do
  describe User do
    it 'accepts only known roles' do
      expect(build(:user, role: 'owner')).not_to be_valid
    end

    it 'lets clinicians and admins approve, not staff' do
      expect(build(:user, :clinician)).to be_approver
      expect(build(:user, :admin)).to be_approver
      expect(build(:user)).not_to be_approver
    end
  end

  describe Organization do
    it 'requires a name and a 10-digit NPI when given' do
      expect(build(:organization, name: '')).not_to be_valid
      expect(build(:organization, npi: '123')).not_to be_valid
      expect(build(:organization, npi: '1234567893')).to be_valid
    end
  end

  describe Patient do
    it 'rejects a future date of birth' do
      expect(build(:patient, date_of_birth: 1.day.from_now.to_date)).not_to be_valid
    end

    it 'keeps MRNs unique within a practice but not across practices' do
      existing = create(:patient, mrn: 'A1')
      expect(build(:patient, organization: existing.organization, mrn: 'A1')).not_to be_valid
      expect(build(:patient, mrn: 'A1')).to be_valid
    end

    it 'searches by name and MRN, case-insensitively' do
      patient = create(:patient, first_name: 'Marcus', last_name: 'Bell', mrn: 'MB-9')
      expect(Patient.search('bell')).to include(patient)
      expect(Patient.search('mb-9')).to include(patient)
      expect(Patient.search('zzz')).not_to include(patient)
    end
  end

  describe ChartDocument do
    let(:document) { create(:chart_document) }

    it 'normalizes line endings and trims the body' do
      doc = create(:chart_document, body: "  line one\r\nline two  ")
      expect(doc.body).to eq("line one\nline two")
    end

    it 'refuses to change the body once saved, since citations point into it' do
      document.body = 'something else'
      expect(document).not_to be_valid
      expect(document.errors[:body].first).to match(/cannot change/)
    end

    it 'must belong to the same organization as the patient' do
      doc = build(:chart_document, organization: create(:organization))
      expect(doc).not_to be_valid
    end
  end

  describe PolicyTemplate do
    let(:payer) { create(:payer) }

    it "prefers the payer's own template over the generic one" do
      generic = create(:policy_template, item_name: 'Zepbound')
      specific = create(:policy_template, item_name: 'Zepbound', payer: payer)

      expect(PolicyTemplate.resolve(item_name: 'zepbound', payer: payer)).to eq(specific)
      expect(PolicyTemplate.resolve(item_name: 'Zepbound', payer: create(:payer))).to eq(generic)
    end

    it 'exposes criterion hints' do
      template = create(:policy_template)
      expect(template.criteria.first.bmi_min).to eq(30.0)
      expect(template.criteria.second.terms).to eq(%w[obesity E66])
    end
  end

  describe PriorAuthorization do
    let(:pa) { create_prior_authorization }

    it 'refuses a status write that bypasses TransitionService' do
      pa.status = 'approved'
      expect(pa).not_to be_valid
      expect(pa.errors[:status].first).to match(/TransitionService/)
    end

    it 'knows which transitions are allowed' do
      expect(pa.status).to eq('gathering')
      expect(pa.can_transition_to?('ready_for_review')).to be true
      expect(pa.can_transition_to?('submitted')).to be false
    end

    it 'changes its content digest when evidence changes' do
      before = pa.content_digest
      req = pa.requirements.first
      doc = pa.patient.chart_documents.first
      Authorizations::AddEvidenceService.call(req, actor: pa.created_by, document: doc, quote: 'BMI 34.2')
      expect(pa.reload.content_digest).not_to eq(before)
    end

    it 'rejects a patient from another practice' do
      pa.patient = create(:patient)
      expect(pa).not_to be_valid
    end
  end

  describe AuthorizationRequirement do
    let(:pa) { create_prior_authorization }
    let(:requirement) { pa.requirements.first }

    it 'cannot be met without verified evidence' do
      requirement.status = 'met'
      expect(requirement).not_to be_valid
      expect(requirement.errors[:status].first).to match(/verified/)
    end

    it 'needs a note to be not applicable' do
      requirement.status = 'not_applicable'
      expect(requirement).not_to be_valid
      requirement.note = 'BMI is over 30, so the comorbidity branch does not apply.'
      expect(requirement).to be_valid
    end
  end

  describe AuthorizationEvidence do
    let(:pa) { create_prior_authorization }
    let(:requirement) { pa.requirements.first }
    let(:document) { pa.patient.chart_documents.first }

    def build_evidence(excerpt:, start:, finish:, doc: document)
      requirement.evidence.build(chart_document: doc, excerpt: excerpt, start_offset: start, end_offset: finish, extracted_by: 'ai')
    end

    it 'is valid when the excerpt is exactly the document text at the offsets' do
      start = document.body.index('BMI 34.2')
      expect(build_evidence(excerpt: 'BMI 34.2', start: start, finish: start + 8)).to be_valid
    end

    it 'rejects an excerpt that is not in the document at those offsets' do
      expect(build_evidence(excerpt: 'BMI 41.0', start: 0, finish: 8)).not_to be_valid
    end

    it "rejects a document from another patient's chart" do
      other = create(:chart_document, patient: create(:patient, organization: pa.organization))
      start = other.body.index('BMI 34.2')
      expect(build_evidence(excerpt: 'BMI 34.2', start: start, finish: start + 8, doc: other)).not_to be_valid
    end
  end

  describe WorkflowEvent do
    it 'cannot be changed or destroyed' do
      pa = create_prior_authorization
      event = pa.workflow_events.first
      expect { event.update!(event_type: 'approved') }.to raise_error(ActiveRecord::ReadOnlyRecord)
      expect { event.destroy }.to raise_error(ActiveRecord::ReadOnlyRecord)
    end
  end

  describe Task do
    it 'stamps completed_at when closed and clears it when reopened' do
      pa = create_prior_authorization
      task = Task.create!(organization: pa.organization, subject: pa, title: 'Call clinician')
      task.update!(status: 'done')
      expect(task.completed_at).to be_present
      task.update!(status: 'open')
      expect(task.completed_at).to be_nil
    end

    it 'is overdue when open past its due date' do
      pa = create_prior_authorization
      task = Task.new(organization: pa.organization, subject: pa, title: 'x', due_on: Date.yesterday)
      expect(task).to be_overdue
    end
  end
end
