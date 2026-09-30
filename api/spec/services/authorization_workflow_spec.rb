# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Prior authorization workflow services' do
  let(:pa) { create_prior_authorization }
  let(:staff) { pa.created_by }
  let(:clinician) { pa.requested_by }

  describe Authorizations::CreateService do
    it 'creates one pending requirement per criterion and starts gathering' do
      expect(pa.status).to eq('gathering')
      expect(pa.requirements.map(&:status).uniq).to eq([ 'pending' ])
      expect(pa.requirements.size).to eq(3)
      expect(pa.workflow_events.map(&:event_type)).to eq(%w[created status_changed])
    end

    it 'refuses an item with no criteria' do
      expect { create_prior_authorization(item_name: 'Unknownium') }.not_to raise_error # factory creates one
      org = create(:organization)
      patient = create(:patient, organization: org)
      expect {
        Authorizations::CreateService.call(organization: org, actor: create(:user, organization: org), patient: patient,
                                           coverage: create(:patient_coverage, patient: patient), item_name: 'Nothing',
                                           requested_by: create(:user, :clinician, organization: org))
      }.to raise_error(Authorizations::Error, /no criteria for Nothing/)
    end

    it "refuses a coverage that isn't the patient's" do
      org = pa.organization
      other = create(:patient_coverage, patient: create(:patient, organization: org))
      expect {
        Authorizations::CreateService.call(organization: org, actor: staff, patient: pa.patient, coverage: other,
                                           item_name: 'Wegovy', requested_by: clinician)
      }.to raise_error(Authorizations::Error, /does not belong/)
    end
  end

  describe Authorizations::TransitionService do
    it 'refuses a transition the table does not allow' do
      expect { Authorizations::TransitionService.call(pa, to: 'submitted', actor: staff) }
        .to raise_error(Authorizations::Error, /cannot move to submitted/)
    end

    it 'records an event with the actor' do
      Authorizations::TransitionService.call(pa, to: 'cancelled', actor: staff)
      event = pa.workflow_events.order(:id).last
      expect([ event.from_status, event.to_status, event.actor ]).to eq([ 'gathering', 'cancelled', staff ])
    end

    it 'dismisses open tasks when a request is cancelled' do
      Task.create!(organization: pa.organization, subject: pa, title: 'Follow up')
      Authorizations::TransitionService.call(pa, to: 'cancelled', actor: staff)
      expect(Task.where(subject: pa).pluck(:status)).to eq([ 'dismissed' ])
    end
  end

  describe 'review and approval' do
    it 'moves to ready for review once every requirement is resolved' do
      resolve_all_requirements!(pa, actor: staff)
      expect(pa.status).to eq('ready_for_review')
    end

    it 'moves to needs clarification when something is missing and nothing is pending' do
      pa.requirements.each do |req|
        Authorizations::RequirementReviewService.call(req, actor: staff, status: 'missing')
      end
      expect(pa.reload.status).to eq('needs_clarification')
      expect(Task.open.where(subject: pa).count).to eq(3)
      expect(Task.open.where(subject: pa).pluck(:assignee_id).uniq).to eq([ clinician.id ])
    end

    it 'closes the task once the requirement is resolved' do
      req = pa.requirements.first
      Authorizations::RequirementReviewService.call(req, actor: staff, status: 'missing')
      expect(Task.open.where(source: req).count).to eq(1)
      Authorizations::RequirementReviewService.call(req.reload, actor: staff, status: 'not_applicable', note: 'Not required for this plan')
      expect(Task.where(source: req).pluck(:status)).to eq([ 'done' ])
    end

    it 'refuses to mark met on unverified evidence' do
      req = pa.requirements.first
      expect { Authorizations::RequirementReviewService.call(req, actor: staff, status: 'met') }
        .to raise_error(Authorizations::Error, /verified/)
    end

    it 'sends a met requirement back to pending when its only evidence is rejected' do
      resolve_all_requirements!(pa, actor: staff)
      req = pa.requirements.first
      req.evidence.each { |ev| Authorizations::EvidenceReviewService.call(ev, actor: staff, action: 'reject') }
      expect(req.reload.status).to eq('pending')
      expect(pa.reload.status).to eq('gathering')
    end

    it 'adds human evidence only when the quote is in the document' do
      req = pa.requirements.first
      doc = pa.patient.chart_documents.first
      expect { Authorizations::AddEvidenceService.call(req, actor: staff, document: doc, quote: 'BMI 50') }
        .to raise_error(Authorizations::Error, /does not appear/)

      ev = Authorizations::AddEvidenceService.call(req, actor: staff, document: doc, quote: 'BP 128/82.')
      expect(ev).to be_verified
      expect(ev.extracted_by).to eq('human')
    end

    describe Authorizations::ApproveService do
      before { resolve_all_requirements!(pa, actor: staff) }

      it 'refuses staff' do
        expect { Authorizations::ApproveService.call(pa, actor: staff) }
          .to raise_error(Authorizations::Error, /clinician or an admin/)
      end

      it 'lets a clinician approve and pins the content digest' do
        Authorizations::ApproveService.call(pa, actor: clinician)
        expect(pa.reload.status).to eq('approved')
        expect(pa.latest_approval.content_digest).to eq(pa.content_digest)
        expect(pa).to be_approval_current
      end

      it 'voids the approval when evidence changes afterwards' do
        Authorizations::ApproveService.call(pa, actor: clinician)
        req = pa.requirements.first
        doc = pa.patient.chart_documents.first
        Authorizations::AddEvidenceService.call(req, actor: staff, document: doc, quote: 'BP 128/82.')

        expect(pa.reload.status).to eq('ready_for_review')
        expect(pa).not_to be_approval_current
        expect(pa.workflow_events.pluck(:event_type)).to include('approval_invalidated')
      end
    end

    describe Authorizations::ManualTransitionService do
      before do
        resolve_all_requirements!(pa, actor: staff)
        Authorizations::ApproveService.call(pa, actor: clinician)
      end

      it 'submits an approved request and records the payer reference' do
        Authorizations::ManualTransitionService.call(pa, actor: staff, to: 'submitted', payer_reference: 'PA-778812', prep_minutes_reported: 6)
        pa.reload
        expect([ pa.status, pa.payer_reference, pa.prep_minutes_reported ]).to eq([ 'submitted', 'PA-778812', 6 ])
        expect(pa.submitted_at).to be_present
      end

      it 'records the decision time' do
        Authorizations::ManualTransitionService.call(pa, actor: staff, to: 'submitted')
        Authorizations::ManualTransitionService.call(pa, actor: staff, to: 'approved_by_payer')
        expect(pa.reload.decided_at).to be_present
      end

      it 'refuses statuses Nora sets itself' do
        expect { Authorizations::ManualTransitionService.call(pa, actor: staff, to: 'ready_for_review') }
          .to raise_error(Authorizations::Error, /set by Nora/)
      end
    end
  end

  describe Authorizations::PacketService do
    it 'refuses before approval' do
      expect { Authorizations::PacketService.call(pa) }.to raise_error(Authorizations::Error, /approved packet/)
    end

    it 'renders a PDF with the cited excerpts once approved' do
      resolve_all_requirements!(pa, actor: staff)
      Authorizations::ApproveService.call(pa, actor: clinician)
      pdf = Authorizations::PacketService.call(pa.reload)

      expect(pdf).to start_with('%PDF')
      text = PDF::Reader.new(StringIO.new(pdf)).pages.map(&:text).join(' ')
      expect(text).to include('Prior authorization request', 'BMI 34.2', 'Approved by')
    end
  end

  describe Authorizations::StartExtractionService do
    it 'queues the job and refuses a second concurrent run' do
      expect { Authorizations::StartExtractionService.call(pa, actor: staff) }.to have_enqueued_job(ExtractEvidenceJob)
      expect(pa.reload.extraction_status).to eq('running')
      expect { Authorizations::StartExtractionService.call(pa, actor: staff) }.to raise_error(Authorizations::Error, /already running/)
    end
  end

  describe ExtractEvidenceJob do
    it 'records an unexpected failure on the request' do
      allow(Authorizations::EvidenceExtractionService).to receive(:call).and_raise(RuntimeError, 'boom')
      expect { ExtractEvidenceJob.perform_now(pa.id, staff.id) }.to raise_error(RuntimeError)
      expect(pa.reload.extraction_status).to eq('failed')
    end
  end

  describe Workspace::TodayService do
    it 'lists what needs a person and counts by status' do
      pa.requirements.each { |req| Authorizations::RequirementReviewService.call(req, actor: staff, status: 'missing') }
      data = Workspace::TodayService.call(organization: pa.organization, user: clinician)

      expect(data[:counts][:by_status]).to eq('needs_clarification' => 1)
      expect(data[:needs_attention].map { |i| i[:kind] }).to eq([ 'needs_clarification' ])
      expect(data[:my_tasks].size).to eq(3)
    end
  end
end
