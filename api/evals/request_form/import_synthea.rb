# Turns Synthea output into the eval's Synthea patients.
#
#   java -jar synthea-with-dependencies.jar -s 2026 -p 40 -a 25-70 \
#     --exporter.fhir.export=true --exporter.years_of_history=3 Ohio Columbus
#   bin/rails runner evals/request_form/import_synthea.rb path/to/output/fhir
#
# Synthea charts have no Coverage, no GLP-1 prescription and no prescriber, and
# record diagnoses as SNOMED encounter diagnoses. This keeps what Nora reads
# (Patient, Condition, BMI Observations, MedicationRequests) for the first four
# adults whose latest BMI is 27 or more, and adds, by hand-written rule, what a
# GLP-1 request needs: a Coverage, the prescription, its prescriber. The added
# resources carry meta.tag "nora-eval-added" so they can be told apart.
require "json"

dir = ARGV.fetch(0)
out = Rails.root.join("evals/request_form/patients")
added = { meta: { tag: [ { system: "https://nora.example/fhir/tags", code: "nora-eval-added" } ] } }
plans = [
  { payer: "Blue Cross Blue Shield Federal Employee Program", payer_id: "demo-payer-fep", plan: "FEP Blue Standard", group: "65",
    rx: { "rxbin" => "999104", "rxpcn" => "DEMOFEP", "rxgroup" => "RXFEP65" }, drug: [ "2553506", "Wegovy 0.25 mg/0.5 mL auto-injector", 4, 28 ] },
  { payer: "Blue Cross Blue Shield Federal Employee Program", payer_id: "demo-payer-fep", plan: "FEP Blue Focus", group: "131",
    rx: {}, drug: [ "2669706", "Zepbound 2.5 mg/0.5 mL auto-injector", 4, 28 ] },
  { payer: "UnitedHealthcare", payer_id: "demo-payer-uhc", plan: "Choice Plus", group: "902211",
    rx: { "rxbin" => "999101", "rxpcn" => "DEMOUHC", "rxgroup" => "RXUHC12" }, drug: [ "2553506", "Wegovy 0.25 mg/0.5 mL auto-injector", 4, 28 ] },
  { payer: "Aetna", payer_id: "demo-payer-aetna", plan: "Choice POS II", group: "0550120",
    rx: { "rxbin" => "999102", "rxpcn" => "DEMOAET" }, drug: [ "2669706", "Zepbound 2.5 mg/0.5 mL auto-injector", 4, 28 ] }
]
klass = ->(code, value, name = nil) { { type: { coding: [ { system: "http://terminology.hl7.org/CodeSystem/coverage-class", code: code } ] }, value: value, name: name }.compact }

picked = Dir.glob(File.join(dir, "*.json")).sort.filter_map do |path|
  entries = JSON.parse(File.read(path))["entry"]
  # Synthea's bundles refer to each other by urn:uuid, as a transaction does
  # before a server assigns ids; a server holds them as Type/id.
  ids = entries.to_h { |e| [ e["fullUrl"], "#{e['resource']['resourceType']}/#{e['resource']['id']}" ] }
  resources = JSON.parse(JSON.generate(entries.map { |e| e["resource"] }).gsub(/"urn:uuid:[0-9a-f-]+"/) { |urn| ids[urn[1..-2]].then { |ref| ref ? "\"#{ref}\"" : urn } })
  patient = resources.find { |r| r["resourceType"] == "Patient" } or next
  bmis = resources.select { |r| r["resourceType"] == "Observation" && r.dig("code", "coding").to_a.any? { |c| c["code"] == "39156-5" } }
  latest = bmis.max_by { |o| o["effectiveDateTime"].to_s }
  age = ((Date.new(2026, 10, 23) - Date.iso8601(patient["birthDate"])) / 365.25).floor
  next unless latest && latest.dig("valueQuantity", "value") >= 27 && age.between?(25, 70) && !patient.key?("deceasedDateTime")

  [ patient, resources.select { |r| %w[Condition MedicationRequest].include?(r["resourceType"]) } + bmis ]
end.first(plans.size)

picked.each_with_index do |(patient, kept), i|
  plan = plans[i]
  id = patient["id"]
  rxnorm, display, quantity, days = plan[:drug]
  coverage = added.merge(
    resourceType: "Coverage", id: "#{id}-coverage", status: "active", subscriberId: "SYN#{900_000 + i}",
    identifier: [ { type: { coding: [ { system: "http://terminology.hl7.org/CodeSystem/v2-0203", code: "MB" } ] }, value: "SYN#{900_000 + i}" } ],
    beneficiary: { reference: "Patient/#{id}" }, payor: [ { reference: "Organization/#{plan[:payer_id]}", display: plan[:payer] } ],
    class: [ klass.call("group", plan[:group]), klass.call("plan", plan[:plan].parameterize, plan[:plan]) ] + plan[:rx].map { |code, value| klass.call(code, value) }
  )
  prescription = added.merge(
    resourceType: "MedicationRequest", id: "#{id}-glp1", status: "active", intent: "order", subject: { reference: "Patient/#{id}" },
    medicationCodeableConcept: { coding: [ { system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: rxnorm } ], text: display },
    authoredOn: "2026-10-01", requester: { reference: "Practitioner/demo-avery-chen" },
    dosageInstruction: [ { text: "Inject under the skin once weekly." } ],
    dispenseRequest: { quantity: { value: quantity, unit: "pen" }, expectedSupplyDuration: { value: days, unit: "days" } }
  )
  resources = [ patient ] + kept + [ coverage, prescription ]
  bundle = { resourceType: "Bundle", type: "collection", entry: resources.map { |r| { resource: r } } }
  out.join("synthea-#{i + 1}.json").write(JSON.pretty_generate(bundle) + "\n")
  puts "synthea-#{i + 1}: #{patient.dig('name', 0, 'given', 0)} #{patient.dig('name', 0, 'family')} #{id} (#{plan[:plan]}, #{display.split.first})"
end
