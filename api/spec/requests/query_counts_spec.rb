# frozen_string_literal: true

require 'rails_helper'

# The screens the demo walkthrough and the console read, on the seeded demo
# practice. Each endpoint must cost the same number of queries however many
# requests and tasks exist (no N+1), and no more than it does today.
RSpec.describe 'Query counts', type: :request do
  let!(:organization) { seed_demo_practice }
  let(:staff) { organization.users.find_by!(email: 'ma@nora.com') }
  let(:clinician) { organization.users.find_by!(email: 'clinician@nora.com') }
  let(:featured) { Demo::Practice.featured_request }

  # The most each endpoint may run. Lower is fine; raise one only on purpose.
  CEILINGS = {
    today: 19, prior_authorizations: 13, prior_authorization: 18, events: 6, tasks_for_request: 7,
    tasks: 7, patients: 5, patient: 15, members: 3, policy_templates: 3, metrics: 9
  }.freeze

  def paths
    {
      today: '/api/v1/today', prior_authorizations: '/api/v1/prior_authorizations',
      prior_authorization: "/api/v1/prior_authorizations/#{featured.id}", events: "/api/v1/prior_authorizations/#{featured.id}/events",
      tasks_for_request: "/api/v1/tasks?prior_authorization_id=#{featured.id}&status=open", tasks: '/api/v1/tasks',
      patients: '/api/v1/patients', patient: "/api/v1/patients/#{featured.patient_id}", members: '/api/v1/organization/members',
      policy_templates: '/api/v1/policy_templates', metrics: '/api/v1/metrics'
    }
  end

  def count_queries
    count = 0
    counter = ->(*, payload) { count += 1 unless %w[SCHEMA TRANSACTION].include?(payload[:name]) || payload[:cached] }
    ActiveSupport::Notifications.subscribed(counter, 'sql.active_record') { yield }
    count
  end

  def measure
    paths.transform_values do |path|
      count_queries { get path, headers: auth_headers(staff) }.tap { expect(response).to have_http_status(:ok) }
    end
  end

  # More requests on every patient, spread over each status Today lists, each
  # with an open task for the staff member. Statuses are written directly:
  # this only shapes data for reading, it does not exercise the workflow.
  def add_requests(per_patient)
    organization.patients.each do |patient|
      per_patient.times do |i|
        pa = Authorizations::CreateService.call(organization: organization, actor: staff, patient: patient, coverage: patient.coverages.first,
                                                item_name: 'Wegovy', requested_by: clinician, assigned_to: staff)
        Authorizations::EvidenceExtractionService.call(pa, actor: staff, model_pass: false)
        pa.update_column(:status, %w[needs_clarification ready_for_review approved denied][i % 4])
        Task.create!(organization: organization, subject: pa, assignee: staff, title: 'Follow up', status: 'open', due_on: Date.current + 3)
      end
    end
  end

  it 'costs the same number of queries however much data there is' do
    add_requests(1)
    small = measure
    add_requests(3)
    large = measure

    expect(large).to eq(small)
  end

  it 'stays within each endpoint\'s ceiling' do
    add_requests(1)
    measure.each do |endpoint, count|
      expect(count).to be <= CEILINGS.fetch(endpoint), "#{endpoint} ran #{count} queries (ceiling #{CEILINGS[endpoint]})"
    end
  end
end
