# Synthetic practice, staff, and patients for development and demos.
# Every name, date, identifier, and note here is invented.

org = Organization.find_or_create_by!(name: "Demo Family Medicine") { |o| o.npi = "1234567893" }

def seed_user(org, email, first, last, role)
  user = User.find_or_initialize_by(email: email)
  user.assign_attributes(password: "password123", password_confirmation: "password123",
                         first_name: first, last_name: last, role: role, organization: org)
  user.save!
  user
end

admin = seed_user(org, "demo@nora.com", "Demo", "Admin", "admin")
clinician = seed_user(org, "clinician@nora.com", "Avery", "Chen", "clinician")
seed_user(org, "ma@nora.com", "Jordan", "Blake", "staff")

plan = ->(payer, name) { InsurancePlan.joins(:payer).find_by!(payers: { name: payer }, name: name) }

PATIENTS = [
  {
    mrn: "DEMO-1001", first_name: "Jane", last_name: "Rivera", date_of_birth: "1984-03-14", sex: "female",
    coverage: [ "UnitedHealthcare", "Choice Plus", "UHC900114572" ],
    documents: [
      { kind: "office_note", title: "Office visit, weight management", occurred_on: "2026-08-12", body: <<~NOTE },
        Patient: Jane Rivera   DOB: 03/14/1984   MRN: DEMO-1001
        Provider: Avery Chen, MD

        Chief complaint: Follow-up for weight management.

        HPI: Jane Rivera is a 42-year-old woman seen for ongoing weight management. She has followed a reduced-calorie diet with our dietitian since January 2026 and walks 30 minutes five days a week. Weight is down 4 lb over 7 months despite adherence.

        Vitals: Height 5 ft 5 in. Weight 214 lb. BMI 34.2. BP 128/82.

        Assessment: Obesity, class I (E66.01), BMI 34.0-34.9 (Z68.34). Prediabetes, A1c 6.1%.

        Plan: Discussed GLP-1 therapy. Previously tried Saxenda (liraglutide) from 2025-06 to 2025-10; discontinued due to persistent nausea and vomiting. Will request prior authorization for Wegovy 0.25 mg weekly with titration. Continue diet and activity program.
      NOTE
      { kind: "medication_history", title: "Medication history", occurred_on: "2026-08-12", body: <<~NOTE },
        Current medications: metformin 500 mg daily (prediabetes), cetirizine 10 mg daily.
        Past medications: Saxenda (liraglutide 3 mg) 06/2025 to 10/2025, stopped for GI intolerance (nausea, vomiting).
      NOTE
      { kind: "problem_list", title: "Problem list", occurred_on: "2026-08-12", body: <<~NOTE }
        1. Obesity, class I (E66.01)
        2. Prediabetes (R73.03)
        3. Seasonal allergic rhinitis (J30.2)
      NOTE
    ]
  },
  {
    mrn: "DEMO-1002", first_name: "Marcus", last_name: "Bell", date_of_birth: "1971-11-02", sex: "male",
    coverage: [ "Aetna", "Open Access Managed Choice", "W228841093" ],
    documents: [
      { kind: "office_note", title: "Annual visit", occurred_on: "2026-07-30", body: <<~NOTE },
        Patient: Marcus Bell, DOB 11/02/1971

        Marcus Bell presents for his annual exam and to discuss weight. He has worked with a nutrition coach on a reduced-calorie meal plan since November 2025 and does physical activity (cycling) three times weekly.

        Vitals: Weight 196 lb, height 5 ft 10 in, BMI 28.4. BP 142/90 on lisinopril.

        Assessment:
        - Overweight (E66.3), BMI 28.0-28.9 (Z68.28)
        - Essential hypertension (I10), not at goal
        - Type 2 diabetes (E11.9), A1c 7.4%

        Plan: Phentermine 37.5 mg was tried March to May 2025 with 3 lb loss; stopped due to palpitations and elevated blood pressure. Will request Zepbound. Continue lifestyle program.
      NOTE
      { kind: "medication_history", title: "Medication list", occurred_on: "2026-07-30", body: <<~NOTE }
        Active: lisinopril 20 mg daily, metformin 1000 mg twice daily, atorvastatin 20 mg daily.
        Inactive: phentermine 37.5 mg daily (03/2025 to 05/2025), stopped for palpitations.
      NOTE
    ]
  },
  {
    mrn: "DEMO-1003", first_name: "Priya", last_name: "Nair", date_of_birth: "1990-06-21", sex: "female",
    coverage: [ "Cigna", "Open Access Plus", "U55120394" ],
    documents: [
      { kind: "office_note", title: "New patient visit", occurred_on: "2026-09-10", body: <<~NOTE }
        Patient: Priya Nair (DOB 06/21/1990)

        New patient establishing care. Interested in weight-loss medication. Started a reduced-calorie diet about 2 months ago on her own. No structured exercise program yet.

        Vitals: BMI 31.0, BP 118/76.

        Assessment: Obesity (E66.9), BMI 31.0-31.9 (Z68.31).

        Plan: Discussed that most plans require 6 months of documented lifestyle program. Referred to dietitian. Will consider Wegovy after follow-up. No prior weight-loss medications.
      NOTE
    ]
  },
  {
    mrn: "DEMO-1004", first_name: "Tom", last_name: "Okafor", date_of_birth: "1978-01-09", sex: "male",
    coverage: [ "Blue Cross Blue Shield", "Blue Choice PPO", "XJB700331862" ],
    documents: [
      { kind: "office_note", title: "Weight management follow-up", occurred_on: "2026-08-28", body: <<~NOTE }
        Patient: Tom Okafor  DOB: 01/09/1978

        Tom Okafor returns for weight management. He has been in a supervised lifestyle program with reduced-calorie diet and physical activity (gym three days a week) since December 2025. Weight is stable.

        Vitals: BMI 36.5. BP 130/84. Obstructive sleep apnea on CPAP.

        Assessment: Obesity, class II (E66.01), BMI 36.0-36.9 (Z68.36). Obstructive sleep apnea (G47.33).

        Plan: Orlistat 120 mg three times daily was tried from 01/2026 to 04/2026 with minimal weight loss and GI side effects; discontinued. Requesting Saxenda. Not on any other GLP-1 receptor agonist.
      NOTE
    ]
  },
  {
    mrn: "DEMO-1005", first_name: "Elena", last_name: "Petrov", date_of_birth: "1966-09-30", sex: "female",
    coverage: [ "UnitedHealthcare", "Navigate", "UHC900287710" ],
    documents: [
      { kind: "office_note", title: "Office visit", occurred_on: "2026-09-02", body: <<~NOTE },
        Patient: Elena Petrov, DOB 09/30/1966, MRN DEMO-1005

        Elena Petrov is seen to discuss weight management. She has completed a 9-month reduced-calorie diet and physical activity program with our dietitian, with a 5 lb loss.

        Vitals: BMI 38.1. BP 136/86 on amlodipine.

        Assessment: Obesity, class II (E66.01), BMI 38.0-38.9 (Z68.38). Hypertension (I10). Dyslipidemia (E78.5).

        Medication history: Phentermine 03/2024 to 06/2024, stopped for insomnia and palpitations. Contrave (naltrexone/bupropion) 09/2024 to 02/2025, stopped for headaches and inadequate response.

        Plan: Request Wegovy. She is not taking any other GLP-1 receptor agonist.
      NOTE
      { kind: "problem_list", title: "Problem list", occurred_on: "2026-09-02", body: <<~NOTE }
        Obesity, class II (E66.01)
        Essential hypertension (I10)
        Dyslipidemia (E78.5)
      NOTE
    ]
  }
].freeze

PATIENTS.each do |attrs|
  patient = org.patients.find_or_initialize_by(mrn: attrs[:mrn])
  patient.update!(attrs.slice(:first_name, :last_name, :date_of_birth, :sex))

  payer, plan_name, member_id = attrs[:coverage]
  patient.coverages.find_or_create_by!(insurance_plan: plan.call(payer, plan_name), member_id: member_id)

  attrs[:documents].each do |doc|
    next if patient.chart_documents.exists?(title: doc[:title], occurred_on: doc[:occurred_on])

    patient.chart_documents.create!(doc.merge(organization: org, uploaded_by: admin, source: "paste"))
  end
end

puts "Synthetic practice: #{org.name}, #{org.users.count} staff, #{org.patients.count} patients."
puts "Logins (password123): demo@nora.com (admin), #{clinician.email} (clinician), ma@nora.com (staff)"
