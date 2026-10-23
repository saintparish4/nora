require "json"

# FHIR R4 data for the demo practice (db/fhir/demo_patients.rb).
namespace :fhir do
  US_CORE = "http://hl7.org/fhir/us/core/StructureDefinition".freeze
  DEMO_DIR = Rails.root.join("db/fhir/demo")

  desc "Write one FHIR R4 transaction Bundle per demo patient into db/fhir/demo/"
  task :demo_bundles do
    spec = eval(Rails.root.join("db/fhir/demo_patients.rb").read, binding, "db/fhir/demo_patients.rb") # rubocop:disable Security/Eval
    DEMO_DIR.mkpath
    spec[:patients].each do |patient|
      bundle = FhirDemo.bundle(patient, prescriber: spec[:prescriber], payers: spec[:payers])
      DEMO_DIR.join("#{patient[:id]}.json").write(JSON.pretty_generate(bundle) + "\n")
    end
    puts "Wrote #{spec[:patients].size} bundles to #{DEMO_DIR.relative_path_from(Rails.root)}"
  end

  desc "Validate db/fhir/demo/*.json against US Core 6.1 with the official HL7 validator (needs Java 17+)"
  task :validate do
    jar = Rails.root.join("tmp/validator_cli.jar")
    unless jar.exist?
      url = "https://github.com/hapifhir/org.hl7.fhir.core/releases/latest/download/validator_cli.jar"
      system("curl", "-sSL", "-o", jar.to_s, url, exception: true)
    end
    files = DEMO_DIR.glob("*.json").map(&:to_s)
    ok = system("java", "-jar", jar.to_s, *files, "-version", "4.0.1", "-ig", "hl7.fhir.us.core#6.1.0",
                "-output-style", "compact")
    abort "FHIR validation failed" unless ok
  end

  desc "Make a key pair for SMART Backend Services: tmp/smart_private_key.pem, and print the public JWK Set to register"
  task smart_key: :environment do
    path = Rails.root.join("tmp/smart_private_key.pem")
    abort "#{path} exists; delete it to make a new one" if path.exist?

    key = OpenSSL::PKey::RSA.new(2048)
    path.write(key.to_pem)
    path.chmod(0o600)
    puts "Wrote #{path.relative_path_from(Rails.root)}. Set FHIR_PRIVATE_KEY_PATH to it. Register this JWK Set with the server:"
    puts JSON.pretty_generate(Fhir::SmartBackendAuth.jwks(key))
  end

  desc "Load db/fhir/demo/*.json into a FHIR server (FHIR_BASE_URL, default http://localhost:8080/fhir)"
  task :load do
    require "net/http"
    base = ENV.fetch("FHIR_BASE_URL", "http://localhost:8080/fhir")
    DEMO_DIR.glob("*.json").sort.each do |path|
      response = Net::HTTP.post(URI(base), path.read, "Content-Type" => "application/fhir+json")
      abort "#{path.basename}: #{response.code} #{response.body[0, 300]}" unless response.is_a?(Net::HTTPSuccess)
      puts "#{path.basename}: #{response.code}"
    end
  end
end

# Builds the resources. Kept beside the tasks: nothing in the app uses it.
module FhirDemo
  module_function

  def bundle(patient, prescriber:, payers:)
    resources = [ practitioner(prescriber), payer(patient, payers), patient_resource(patient), coverage(patient, payers) ]
    resources << medication_request(patient, prescriber) if patient[:medication]
    resources += patient[:conditions].each_with_index.map { |(code, display), i| condition(patient, code, display, i) }
    resources += patient[:bmi].each_with_index.map { |(date, value), i| bmi(patient, date, value, i) }
    {
      resourceType: "Bundle", type: "transaction",
      entry: resources.map do |resource|
        { fullUrl: "https://nora.example/fhir/#{resource[:resourceType]}/#{resource[:id]}", resource: resource,
          request: { method: "PUT", url: "#{resource[:resourceType]}/#{resource[:id]}" } }
      end
    }
  end

  def profile(name) = { profile: [ "#{US_CORE}/#{name}" ] }

  def ref(type, id) = { reference: "#{type}/#{id}" }

  def address(a) = { use: "work", line: [ a[:line] ], city: a[:city], state: a[:state], postalCode: a[:postal_code], country: "US" }

  def practitioner(p)
    {
      resourceType: "Practitioner", id: p[:id], meta: profile("us-core-practitioner"),
      identifier: [ { system: "http://hl7.org/fhir/sid/us-npi", value: p[:npi] } ],
      name: [ { family: p[:family], given: [ p[:given] ], prefix: [ p[:prefix] ], suffix: [ p[:suffix] ] } ],
      telecom: [ { system: "phone", value: p[:phone], use: "work" }, { system: "fax", value: p[:fax], use: "work" } ],
      address: [ address(p[:address]) ]
    }
  end

  def payer(patient, payers)
    name = patient[:coverage][:payer]
    { resourceType: "Organization", id: payers.fetch(name), meta: profile("us-core-organization"), active: true,
      type: [ { coding: [ { system: "http://terminology.hl7.org/CodeSystem/organization-type", code: "pay", display: "Payer" } ] } ],
      name: name }
  end

  def patient_resource(p)
    {
      resourceType: "Patient", id: p[:id], meta: profile("us-core-patient"),
      identifier: [ { type: { coding: [ { system: "http://terminology.hl7.org/CodeSystem/v2-0203", code: "MR" } ] },
                      system: "https://nora.example/fhir/mrn", value: p[:mrn] } ],
      name: [ { use: "official", family: p[:family], given: [ p[:given] ] } ],
      telecom: [ { system: "phone", value: p[:phone], use: "home" } ],
      gender: p[:gender], birthDate: p[:birth_date],
      address: [ address(p[:address]).merge(use: "home") ]
    }
  end

  # US Core Coverage, with the pharmacy-benefit IDs as Coverage.class entries
  # (coverage-class rxbin, rxpcn, rxgroup, rxid), as the CARIN Digital
  # Insurance Card profile places them.
  def coverage(p, payers)
    c = p[:coverage]
    klass = lambda do |code, value, name = nil|
      { type: { coding: [ { system: "http://terminology.hl7.org/CodeSystem/coverage-class", code: code } ] }, value: value, name: name }.compact
    end
    classes = [ klass.call("group", c[:group]), klass.call("plan", c[:plan].parameterize, c[:plan]) ]
    { bin: "rxbin", pcn: "rxpcn", group: "rxgroup", id: "rxid" }.each do |key, code|
      classes << klass.call(code, c.dig(:rx, key)) if c.dig(:rx, key)
    end
    {
      resourceType: "Coverage", id: "#{p[:id]}-coverage", meta: profile("us-core-coverage"),
      identifier: [ { type: { coding: [ { system: "http://terminology.hl7.org/CodeSystem/v2-0203", code: "MB" } ] },
                      system: "https://nora.example/fhir/member-id", value: c[:member_id] } ],
      status: "active",
      type: { coding: [ { system: "https://nahdo.org/sopt", code: "5", display: "PRIVATE HEALTH INSURANCE" } ] },
      subscriberId: c[:member_id], beneficiary: ref("Patient", p[:id]),
      relationship: { coding: [ { system: "http://terminology.hl7.org/CodeSystem/subscriber-relationship", code: "self" } ] },
      payor: [ ref("Organization", payers.fetch(c[:payer])).merge(display: c[:payer]) ],
      class: classes
    }
  end

  def medication_request(p, prescriber)
    m = p[:medication]
    {
      resourceType: "MedicationRequest", id: "#{p[:id]}-rx", meta: profile("us-core-medicationrequest"),
      status: "active", intent: "order",
      category: [ { coding: [ { system: "http://terminology.hl7.org/CodeSystem/medicationrequest-category", code: "community" } ] } ],
      medicationCodeableConcept: { coding: [ { system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: m[:rxnorm] } ], text: m[:display] },
      subject: ref("Patient", p[:id]), authoredOn: m[:authored], requester: ref("Practitioner", prescriber[:id]),
      dosageInstruction: [ { text: m[:sig] } ],
      dispenseRequest: {
        quantity: { value: m[:quantity], unit: "pen" },
        expectedSupplyDuration: { value: m[:days], unit: "days", system: "http://unitsofmeasure.org", code: "d" }
      }
    }
  end

  def condition(p, code, display, index)
    {
      resourceType: "Condition", id: "#{p[:id]}-condition-#{index + 1}", meta: profile("us-core-condition-problems-health-concerns"),
      clinicalStatus: { coding: [ { system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" } ] },
      verificationStatus: { coding: [ { system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "confirmed" } ] },
      category: [ { coding: [ { system: "http://terminology.hl7.org/CodeSystem/condition-category", code: "problem-list-item" } ] } ],
      # No coding.display: the official ICD-10-CM wording differs from the
      # clinical one, which goes in text.
      code: { coding: [ { system: "http://hl7.org/fhir/sid/icd-10-cm", code: code } ], text: display },
      subject: ref("Patient", p[:id])
    }
  end

  def bmi(p, date, value, index)
    {
      resourceType: "Observation", id: "#{p[:id]}-bmi-#{index + 1}", meta: profile("us-core-bmi"), status: "final",
      category: [ { coding: [ { system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" } ] } ],
      code: { coding: [ { system: "http://loinc.org", code: "39156-5", display: "Body mass index (BMI) [Ratio]" } ] },
      subject: ref("Patient", p[:id]), effectiveDateTime: date,
      valueQuantity: { value: value, unit: "kg/m2", system: "http://unitsofmeasure.org", code: "kg/m2" }
    }
  end
end
