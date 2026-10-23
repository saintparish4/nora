# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Da Vinci DTR client' do
  let(:source) { Fhir::BundleSource.new(dir: Fhir::DEMO_BUNDLES) }
  let(:set) { RequestForm::QuestionSet.for(payer: 'Blue Cross Blue Shield Federal Employee Program', item: 'Saxenda') }
  let(:package) { Dtr::Package.for(set) }

  it 'packages a question set with every library its CQL needs, as $questionnaire-package returns it' do
    bundle = package['parameter'].first
    expect(bundle['name']).to eq('PackageBundle')
    expect(bundle.dig('resource', 'entry').map { |e| e.dig('resource', 'resourceType') }).to eq(%w[Questionnaire Library Library Library])
    expect(Dtr::Package.elm(package).keys).to contain_exactly('NoraFepSaxenda', 'NoraCommon', 'FHIRHelpers')
  end

  it "asks the payer for its questions with the coverage and the order, and a SMART token" do
    auth = instance_double(Fhir::SmartBackendAuth, token: 'tok-1')
    request = stub_request(:post, 'https://payer.example/fhir/Questionnaire/$questionnaire-package')
              .with(headers: { 'Authorization' => 'Bearer tok-1', 'Content-Type' => 'application/fhir+json' }) { |r|
                JSON.parse(r.body)['parameter'].map { |p| p['name'] } == %w[coverage order]
              }.to_return(body: package.to_json)

    returned = Dtr::PayerClient.new(base: 'https://payer.example/fhir', auth: auth)
                               .questionnaire_package(coverage: { 'resourceType' => 'Coverage' }, order: { 'resourceType' => 'MedicationRequest' })
    expect(request).to have_been_requested
    expect(Dtr::Package.questionnaires(returned).map { |q| q['url'] }).to eq([ set.resource['url'] ])
  end

  it "fills in the payer's package by running the CQL the package carries, the same as the request form" do
    seed_demo_practice
    tom = PriorAuthorization.joins(:patient).find_by!(patients: { last_name: 'Okafor' })
    from_package = Dtr::Fill.call(tom, package: package, source: source).first
    from_form = RequestForm::Builder.call(tom, source: source).dig(:questions, :questionnaire_response)

    expect(from_package.except('authored')).to eq(from_form.except('authored'))
    expect(from_package['item'].size).to eq(11)
  end

  it "refuses a Questionnaire it does not know rather than guess at its questions" do
    seed_demo_practice
    tom = PriorAuthorization.joins(:patient).find_by!(patients: { last_name: 'Okafor' })
    other = package.deep_dup
    other['parameter'].first['resource']['entry'].first['resource']['url'] = 'https://payer.example/Questionnaire/dinner'
    expect { Dtr::Fill.call(tom, package: other, source: source) }.to raise_error(Dtr::Error, /does not know/)
  end
end
