module Dtr
  # A question set as Da Vinci DTR's $questionnaire-package returns it: a
  # Parameters resource with a PackageBundle holding the Questionnaire and
  # every CQL Library it needs (its own, NoraCommon, FHIRHelpers), each with
  # CQL and ELM. Valid against DTR 2.0.1's output-parameters profile.
  class Package
    OUTPUT_PROFILE = "http://hl7.org/fhir/us/davinci-dtr/StructureDefinition/dtr-qpackage-output-parameters".freeze
    BUNDLE_PROFILE = "http://hl7.org/fhir/us/davinci-dtr/StructureDefinition/DTR-QPackageBundle".freeze

    def self.for(set)
      libraries = [ set.library, "NoraCommon", "FHIRHelpers" ].map do |name|
        JSON.parse(RequestForm::Cql::LIBRARIES.join("#{name}.json").read)
      end
      bundle = {
        "resourceType" => "Bundle", "meta" => { "profile" => [ BUNDLE_PROFILE ] }, "type" => "collection",
        "entry" => ([ set.resource ] + libraries).map { |resource| { "fullUrl" => resource["url"], "resource" => resource } }
      }
      { "resourceType" => "Parameters", "meta" => { "profile" => [ OUTPUT_PROFILE ] }, "parameter" => [ { "name" => "PackageBundle", "resource" => bundle } ] }
    end

    # The ELM in a package's Libraries, by library name, as RequestForm::Cql takes it.
    def self.elm(package)
      bundles = Array(package["parameter"]).select { |p| p["name"].to_s.casecmp?("PackageBundle") }.map { |p| p["resource"] }
      bundles.flat_map { |b| Array(b["entry"]).map { |e| e["resource"] } }.select { |r| r["resourceType"] == "Library" }.to_h do |library|
        content = Array(library["content"]).find { |c| c["contentType"] == "application/elm+json" } or raise Error, "Library #{library['name']} has no ELM"
        [ library["name"], JSON.parse(Base64.decode64(content["data"])) ]
      end
    end

    def self.questionnaires(package)
      Array(package["parameter"]).select { |p| p["name"].to_s.casecmp?("PackageBundle") }
                                 .flat_map { |p| Array(p.dig("resource", "entry")).map { |e| e["resource"] } }
                                 .select { |r| r["resourceType"] == "Questionnaire" }
    end
  end

  class Error < StandardError; end
end
