# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Fhir::HttpSource do
  let(:base) { 'https://fhir.example.org/r4' }
  let(:source) { described_class.new(base: base, token: 'token-1') }
  let(:resources) { Fhir::BundleSource.new(dir: Fhir::DEMO_BUNDLES) }

  def searchset(list) = { resourceType: 'Bundle', type: 'searchset', entry: list.map { |r| { resource: r } } }.to_json

  it 'reads a resource with the bearer token and FHIR JSON' do
    stub = stub_request(:get, "#{base}/Patient/demo-1002")
           .with(headers: { 'Authorization' => 'Bearer token-1', 'Accept' => 'application/fhir+json' })
           .to_return(body: resources.read('Patient', 'demo-1002').to_json)

    expect(source.read('Patient', 'demo-1002')['name'].first['family']).to eq('Bell')
    expect(stub).to have_been_requested
  end

  it 'searches with the US Core parameters and keeps only resources of the type asked for' do
    bmi = resources.search('Observation', patient: 'demo-1002', code: 'http://loinc.org|39156-5')
    stub_request(:get, "#{base}/Observation")
      .with(query: { 'patient' => 'demo-1002', 'code' => 'http://loinc.org|39156-5', '_count' => '100' })
      .to_return(body: searchset(bmi + [ { resourceType: 'OperationOutcome' } ]))

    found = source.search('Observation', patient: 'demo-1002', code: 'http://loinc.org|39156-5')
    expect(found.map { |r| r.dig('valueQuantity', 'value') }).to eq([ 28.4 ])
  end

  it 'treats a missing resource as absent, and other failures as errors' do
    stub_request(:get, "#{base}/Practitioner/nobody").to_return(status: 404, body: '{}')
    stub_request(:get, "#{base}/Patient/x").to_return(status: 500, body: '{}')
    stub_request(:get, "#{base}/Coverage/y").to_raise(Errno::ECONNREFUSED)

    expect(source.read('Practitioner', 'nobody')).to be_nil
    expect { source.read('Patient', 'x') }.to raise_error(Fhir::Error, /500/)
    expect { source.read('Coverage', 'y') }.to raise_error(Fhir::Error, /Could not reach/)
  end

  it 'fills the same fields from a server as from the bundles' do
    stub_request(:get, %r{\A#{base}/}).to_return do |request|
      path = request.uri.path.delete_prefix(URI(base).path + '/')
      type, id = path.split('/')
      if id
        { body: resources.read(type, id).to_json }
      else
        query = URI.decode_www_form(request.uri.query).to_h
        { body: searchset(resources.search(type, patient: query['patient'], status: query['status'],
                                                code: query['code'], category: query['category'])) }
      end
    end
    pa = instance_double(PriorAuthorization, item_name: 'Zepbound')
    over_http = RequestForm::AdminFields.call(pa, chart: Fhir::Chart.new(source: source, patient_id: 'demo-1002'))
    from_bundles = RequestForm::AdminFields.call(pa, chart: Fhir::Chart.new(source: resources, patient_id: 'demo-1002'))

    expect(over_http.map(&:to_h)).to eq(from_bundles.map(&:to_h))
  end
end
