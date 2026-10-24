# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Fhir::Chart do
  let(:bundles) { Fhir::BundleSource.new(dir: Fhir::DEMO_BUNDLES) }

  it "reads an order's drug from the Medication it references, the way Epic sends it" do
    chart = described_class.new(source: EpicShapedSource.new(bundles), patient_id: 'demo-1002')
    order = chart.medication_requests.first

    expect(order).not_to have_key('medicationReference')
    expect(order['medicationCodeableConcept']['coding']).to eq(bundles.search('MedicationRequest', patient: 'demo-1002').first.dig('medicationCodeableConcept', 'coding'))
    expect(order.dig('medicationCodeableConcept', 'text')).to eq('ZEPBOUND 2.5 MG/0.5 ML AUTO-INJECTOR')
    expect(chart.medication_reference(order)).to eq('Medication/med-demo-1002-rx')
  end

  it 'reads a contained Medication' do
    order = { 'resourceType' => 'MedicationRequest', 'id' => 'rx-1', 'medicationReference' => { 'reference' => '#med' },
              'contained' => [ { 'resourceType' => 'Medication', 'id' => 'med', 'code' => { 'text' => 'Wegovy 0.25 mg' } } ] }
    source = instance_double(Fhir::BundleSource, search: [ order ])

    expect(described_class.new(source: source, patient_id: 'p').medication_requests.first.dig('medicationCodeableConcept', 'text')).to eq('Wegovy 0.25 mg')
  end

  it "keeps the reference's display when the Medication cannot be read" do
    order = { 'resourceType' => 'MedicationRequest', 'id' => 'rx-1', 'medicationReference' => { 'reference' => 'Medication/gone', 'display' => 'Wegovy 0.25 mg' } }
    source = instance_double(Fhir::BundleSource, search: [ order ], read: nil)

    expect(described_class.new(source: source, patient_id: 'p').medication_requests.first['medicationCodeableConcept']).to eq('text' => 'Wegovy 0.25 mg')
  end

  it 'leaves an order that carries its own code as it is' do
    chart = described_class.new(source: bundles, patient_id: 'demo-1002')

    expect(chart.medication_requests).to eq(bundles.search('MedicationRequest', patient: 'demo-1002', status: 'active'))
    expect(chart.medication_reference(chart.medication_requests.first)).to be_nil
  end
end
