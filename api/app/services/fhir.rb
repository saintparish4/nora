# Reading a patient's structured chart over FHIR R4 (US Core): demographics,
# coverage, the prescription, the prescriber, problem-list diagnoses, BMI.
#
# FHIR_BASE_URL points Nora at a FHIR server (a local HAPI server loaded with
# `bin/rails fhir:load`, or Epic with FHIR_BEARER_TOKEN). Without it Nora reads
# the demo practice's bundles in db/fhir/demo, which have the same shapes.
module Fhir
  class Error < StandardError; end

  DEMO_BUNDLES = Rails.root.join("db/fhir/demo")

  def self.source
    base = ENV["FHIR_BASE_URL"].presence
    base ? HttpSource.new(base: base, token: ENV["FHIR_BEARER_TOKEN"].presence) : BundleSource.new(dir: DEMO_BUNDLES)
  end
end
