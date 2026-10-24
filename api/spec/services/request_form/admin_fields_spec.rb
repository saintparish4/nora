# frozen_string_literal: true

require 'rails_helper'

# Read against the demo practice's real FHIR bundles (db/fhir/demo), which pass
# the HL7 validator against US Core 6.1.
RSpec.describe RequestForm::AdminFields do
  let(:source) { Fhir::BundleSource.new(dir: Fhir::DEMO_BUNDLES) }

  def fields_for(fhir_id, item)
    chart = Fhir::Chart.new(source: source, patient_id: fhir_id)
    described_class.call(instance_double(PriorAuthorization, item_name: item), chart: chart).index_by(&:key)
  end

  context 'with a chart that holds everything (Marcus Bell, Zepbound, Aetna)' do
    let(:fields) { fields_for('demo-1002', 'Zepbound') }

    it 'fills every field CoverMyMeds asks for, from the chart' do
      expect(fields.transform_values(&:value)).to include(
        first_name: 'Marcus', last_name: 'Bell', date_of_birth: '11/02/1971', sex: 'Male',
        city: 'Dublin', state: 'OH', zip: '43017',
        plan: 'Aetna · Open Access Managed Choice', member_id: 'W228841093', group: '0884102',
        rx_bin: '999102', rx_pcn: 'DEMOAET', rx_group: 'RXAET01', rx_member_id: 'W228841093',
        name: 'Avery Chen, MD', npi: '1987654328', fax: '614-555-0143',
        drug: 'Zepbound 2.5 mg/0.5 mL auto-injector', rxnorm: '2669706', quantity: '4 pen', days_supply: '28',
        primary: 'E66.3 Overweight', bmi_code: 'Z68.28 BMI 28.0-28.9, adult'
      )
      expect(fields.values.map(&:missing)).to all(be_nil)
    end

    it 'says where each value came from: the FHIR element, and where it is in Epic' do
      expect(fields[:rx_bin].source).to eq(reference: 'Coverage/demo-1002-coverage', element: 'Coverage.class (rxbin)', in_epic: 'Coverages')
      expect(fields[:npi].source).to include(reference: 'Practitioner/demo-avery-chen', element: 'Practitioner.identifier (NPI)')
      expect(fields[:quantity].source).to include(reference: 'MedicationRequest/demo-1002-rx', in_epic: 'The prescription order')
    end
  end

  it 'leaves the pharmacy IDs empty when the coverage lacks them, and says where to get them (Jane Rivera)' do
    fields = fields_for('demo-1001', 'Wegovy')

    %i[rx_bin rx_pcn rx_group].each do |key|
      expect(fields[key].value).to be_nil
      expect(fields[key].source).to be_nil
      expect(fields[key].missing).to include('insurance card scan in Coverages', 'call the pharmacy')
    end
    expect(fields[:member_id].value).to eq('U90114572')
  end

  it 'leaves the medication empty when there is no prescription for the item (Priya Nair)' do
    fields = fields_for('demo-1003', 'Wegovy')

    expect(fields[:drug].value).to be_nil
    expect(fields[:drug].missing).to include('No active prescription for Wegovy')
  end

  it 'matches the prescription by RxNorm code, not only by name' do
    renamed = source.search('MedicationRequest', patient: 'demo-1004').first
    renamed['medicationCodeableConcept']['text'] = 'liraglutide pen'
    fields = fields_for('demo-1004', 'Saxenda')

    expect(fields[:drug].value).to eq('liraglutide pen')
    expect(fields[:rxnorm].value).to eq('1598268')
  end

  it 'fills the prescription and prescriber when the order references a Medication, as Epic sends it' do
    expected = fields_for('demo-1002', 'Zepbound').transform_values(&:value)
    chart = Fhir::Chart.new(source: EpicShapedSource.new(source), patient_id: 'demo-1002')
    fields = described_class.call(instance_double(PriorAuthorization, item_name: 'Zepbound'), chart: chart).index_by(&:key)

    expect(fields.transform_values(&:value)).to eq(expected.merge(drug: 'ZEPBOUND 2.5 MG/0.5 ML AUTO-INJECTOR'))
    expect(fields[:rxnorm].source).to include(reference: 'MedicationRequest/demo-1002-rx',
                                              element: 'MedicationRequest.medicationReference → Medication.code.coding (RxNorm)')
  end

  it 'leaves the RxNorm code empty, naming the candidates, when the drug maps to several' do
    order = source.search('MedicationRequest', patient: 'demo-1002').first
    order['medicationCodeableConcept']['coding'] += [ { 'system' => 'http://www.nlm.nih.gov/research/umls/rxnorm', 'code' => '2601723' } ]
    fields = fields_for('demo-1002', 'Zepbound')

    expect(fields[:rxnorm].value).to be_nil
    expect(fields[:rxnorm].missing).to include('several RxNorm codes (2669706, 2601723)')
    expect(fields[:drug].value).to eq('Zepbound 2.5 mg/0.5 mL auto-injector')
  end
end
