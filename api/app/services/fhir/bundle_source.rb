module Fhir
  # FHIR resources read from transaction Bundles on disk, answering the same
  # reads and searches a FHIR server would for the parameters Nora uses.
  class BundleSource
    attr_reader :label

    def initialize(dir:)
      @label = "demo FHIR bundles"
      @resources = Dir.glob(File.join(dir, "*.json")).sort.flat_map do |path|
        JSON.parse(File.read(path)).fetch("entry", []).map { |entry| entry["resource"] }
      end
    end

    def read(type, id)
      @resources.find { |r| r["resourceType"] == type && r["id"] == id }
    end

    # @param params [Hash] patient: (id), status:, code: ("system|code"), category:
    def search(type, params = {})
      @resources.select do |r|
        r["resourceType"] == type &&
          (params[:patient].nil? || patient_ref(r) == "Patient/#{params[:patient]}") &&
          (params[:status].nil? || r["status"] == params[:status]) &&
          (params[:code].nil? || codes(r["code"]).include?(params[:code])) &&
          (params[:category].nil? || Array(r["category"]).any? { |c| codes(c).any? { |sc| sc.end_with?("|#{params[:category]}") } })
      end
    end

    private

    def patient_ref(resource)
      (resource["subject"] || resource["beneficiary"] || resource["patient"] || {})["reference"]
    end

    def codes(concept)
      Array(concept&.dig("coding")).map { |c| "#{c['system']}|#{c['code']}" }
    end
  end
end
