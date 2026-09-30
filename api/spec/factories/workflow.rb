# Factories for the prior authorization domain. All data is synthetic.
FactoryBot.define do
  factory :organization do
    name { "#{Faker::Name.last_name} Family Medicine" }
  end

  factory :patient do
    organization
    first_name { 'Jane' }
    last_name { 'Rivera' }
    sequence(:mrn) { |n| "TEST-#{1000 + n}" }
    date_of_birth { Date.new(1984, 3, 14) }
    sex { 'female' }
  end

  factory :payer do
    sequence(:name) { |n| "Test Payer #{n}" }
  end

  factory :insurance_plan do
    payer
    sequence(:name) { |n| "Plan #{n}" }
    plan_type { 'PPO' }
  end

  factory :patient_coverage do
    patient
    insurance_plan
    member_id { 'UHC900114572' }
  end

  factory :chart_document do
    patient
    organization { patient.organization }
    uploaded_by { association :user, organization: patient.organization }
    kind { 'office_note' }
    title { 'Office visit' }
    occurred_on { Date.new(2026, 8, 12) }
    source { 'paste' }
    body do
      <<~NOTE
        Patient: Jane Rivera   DOB: 03/14/1984   MRN: #{patient.mrn}
        Jane Rivera has followed a reduced-calorie diet with our dietitian since January 2026. Weight is down 4 lb.
        Vitals: BMI 34.2. BP 128/82.
        Assessment: Obesity, class I (E66.01).
        Plan: Previously tried Saxenda from 2025-06 to 2025-10; discontinued due to nausea.
      NOTE
    end
  end

  factory :policy_template do
    item_kind { 'medication' }
    item_name { 'Wegovy' }
    title { 'Wegovy for chronic weight management' }
    payer { nil }

    after(:create) do |template|
      [
        { kind: 'documented_value', text: 'BMI of 30 or greater documented.', hint: { 'bmi_min' => 30 } },
        { kind: 'diagnosis', text: 'Obesity diagnosis documented.', hint: { 'terms' => %w[obesity E66] } },
        { kind: 'lifestyle', text: 'Six months of reduced-calorie diet and physical activity.', hint: { 'terms' => [ 'reduced-calorie' ] } }
      ].each.with_index(1) do |attrs, position|
        template.criteria.create!(attrs.merge(position: position))
      end
    end
  end
end
