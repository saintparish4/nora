# The demo practice's patients as a FHIR server would hold them: what Epic
# keeps as structured data (demographics, coverage, the prescription, the
# prescriber, problem-list diagnoses, BMI), as opposed to the chart notes in
# db/seeds/synthetic_charts.rb. `bin/rails fhir:demo_bundles` writes one FHIR
# R4 transaction Bundle per patient into db/fhir/demo/, shaped to US Core 6.1;
# `bin/rails fhir:validate` checks them with the official HL7 validator.
#
# Every value is invented and must agree with the seeded notes. NPIs carry a
# valid check digit. BIN, PCN and Rx group values are synthetic, not any real
# processor's. Jane Rivera's coverage deliberately has no pharmacy IDs: the
# chart often lacks them, and staff then read the card scan or call the
# pharmacy.
{
  prescriber: {
    id: "demo-avery-chen", npi: "1987654328", family: "Chen", given: "Avery", prefix: "Dr.", suffix: "MD",
    phone: "614-555-0142", fax: "614-555-0143",
    address: { line: "4100 Riverside Drive, Suite 200", city: "Columbus", state: "OH", postal_code: "43221" }
  },
  payers: {
    "UnitedHealthcare" => "demo-payer-uhc", "Aetna" => "demo-payer-aetna", "Cigna" => "demo-payer-cigna",
    "Blue Cross Blue Shield Federal Employee Program" => "demo-payer-fep"
  },
  patients: [
    {
      id: "demo-1001", mrn: "DEMO-1001", family: "Rivera", given: "Jane", gender: "female", birth_date: "1984-03-14",
      phone: "614-555-0181", address: { line: "88 Maple Avenue", city: "Columbus", state: "OH", postal_code: "43215" },
      coverage: { payer: "Cigna", plan: "Open Access Plus", member_id: "U90114572", group: "3341270" },
      medication: { rxnorm: "2553506", display: "Wegovy 0.25 mg/0.5 mL auto-injector", quantity: 4, days: 28,
                    sig: "Inject 0.25 mg under the skin once weekly for 4 weeks, then increase as directed.", authored: "2026-08-12" },
      conditions: [ [ "E66.811", "Obesity, class 1" ], [ "Z68.34", "BMI 34.0-34.9, adult" ], [ "R73.03", "Prediabetes" ] ],
      bmi: [ [ "2026-08-12", 34.2 ] ]
    },
    {
      id: "demo-1002", mrn: "DEMO-1002", family: "Bell", given: "Marcus", gender: "male", birth_date: "1971-11-02",
      phone: "614-555-0196", address: { line: "1520 Oakwood Lane", city: "Dublin", state: "OH", postal_code: "43017" },
      coverage: { payer: "Aetna", plan: "Open Access Managed Choice", member_id: "W228841093", group: "0884102",
                  rx: { bin: "999102", pcn: "DEMOAET", group: "RXAET01", id: "W228841093" } },
      medication: { rxnorm: "2669706", display: "Zepbound 2.5 mg/0.5 mL auto-injector", quantity: 4, days: 28,
                    sig: "Inject 2.5 mg under the skin once weekly for 4 weeks, then increase as directed.", authored: "2026-07-30" },
      conditions: [ [ "E66.3", "Overweight" ], [ "Z68.28", "BMI 28.0-28.9, adult" ], [ "I10", "Essential hypertension" ],
                    [ "E11.9", "Type 2 diabetes mellitus without complications" ] ],
      bmi: [ [ "2026-07-30", 28.4 ] ]
    },
    {
      id: "demo-1003", mrn: "DEMO-1003", family: "Nair", given: "Priya", gender: "female", birth_date: "1990-06-21",
      phone: "614-555-0127", address: { line: "302 Birch Street", city: "Westerville", state: "OH", postal_code: "43081" },
      coverage: { payer: "Cigna", plan: "Open Access Plus", member_id: "U55120394", group: "3341270",
                  rx: { group: "RXCIG22" } },
      medication: nil,
      conditions: [ [ "E66.9", "Obesity, unspecified" ], [ "Z68.31", "BMI 31.0-31.9, adult" ] ],
      bmi: [ [ "2026-09-10", 31.0 ] ]
    },
    {
      id: "demo-1004", mrn: "DEMO-1004", family: "Okafor", given: "Tom", gender: "male", birth_date: "1978-01-09",
      phone: "614-555-0158", address: { line: "77 Cedar Court", city: "Grove City", state: "OH", postal_code: "43123" },
      coverage: { payer: "Blue Cross Blue Shield Federal Employee Program", plan: "FEP Blue Standard", member_id: "R70331862",
                  group: "65", rx: { bin: "999104", pcn: "DEMOFEP", group: "RXFEP65", id: "R70331862" } },
      medication: { rxnorm: "1598268", display: "Saxenda 18 mg/3 mL pen injector", quantity: 5, days: 30,
                    sig: "Inject 0.6 mg under the skin once daily for 1 week, then increase by 0.6 mg weekly to 3 mg daily.",
                    authored: "2026-08-28" },
      conditions: [ [ "E66.812", "Obesity, class 2" ], [ "Z68.36", "BMI 36.0-36.9, adult" ], [ "G47.33", "Obstructive sleep apnea" ] ],
      bmi: [ [ "2026-08-28", 36.5 ] ]
    },
    {
      id: "demo-1005", mrn: "DEMO-1005", family: "Petrov", given: "Elena", gender: "female", birth_date: "1966-09-30",
      phone: "614-555-0164", address: { line: "940 Willow Road", city: "Hilliard", state: "OH", postal_code: "43026" },
      coverage: { payer: "UnitedHealthcare", plan: "Navigate", member_id: "UHC900287710", group: "771204",
                  rx: { bin: "999101", pcn: "DEMOUHC", group: "RXUHC77", id: "UHC900287710" } },
      medication: { rxnorm: "2553506", display: "Wegovy 0.25 mg/0.5 mL auto-injector", quantity: 4, days: 28,
                    sig: "Inject 0.25 mg under the skin once weekly for 4 weeks, then increase as directed.", authored: "2026-09-02" },
      conditions: [ [ "E66.812", "Obesity, class 2" ], [ "Z68.38", "BMI 38.0-38.9, adult" ], [ "I10", "Essential hypertension" ],
                    [ "E78.5", "Hyperlipidemia, unspecified" ] ],
      bmi: [ [ "2026-09-02", 38.1 ] ]
    }
  ]
}
