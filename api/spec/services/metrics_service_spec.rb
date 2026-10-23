# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Workspace::MetricsService do
  it 'reports medians for time to submission and reported prep minutes, plus payer outcomes' do
    pa = create_prior_authorization
    org = pa.organization
    staff = pa.created_by

    travel_to(pa.created_at + 20.minutes) do
      resolve_all_requirements!(pa, actor: staff)
      Authorizations::SubmitService.call(pa, actor: staff, prep_minutes_reported: 6)
    end
    Authorizations::ManualTransitionService.call(pa, actor: staff, to: 'denied')

    other = create_prior_authorization(organization: org)
    Authorizations::TransitionService.call(other, to: 'cancelled', actor: staff)

    metrics = described_class.call(organization: org)

    expect(metrics).to include(
      requests_created: 2,
      submitted: 1,
      median_minutes_to_submission: 20.0,
      median_reported_prep_minutes: 6,
      payer_approved: 0,
      payer_denied: 1
    )
  end

  it 'returns nil medians when nothing has been submitted' do
    expect(described_class.call(organization: create(:organization))).to include(median_minutes_to_submission: nil, requests_created: 0)
  end

  it 'is served at GET /api/v1/metrics', type: :request do
    user = create(:user)
    get '/api/v1/metrics', headers: auth_headers(user)
    expect(parsed_body['metrics']['requests_created']).to eq(0)
  end
end
