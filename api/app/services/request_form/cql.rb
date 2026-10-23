require "open3"

module RequestForm
  # Runs a question set's CQL library against one patient's chart, the way a
  # Da Vinci DTR client fills in a Questionnaire: every answer is a named CQL
  # expression, and "<question> Source" names the resources it read.
  #
  # The ELM is compiled ahead of time (`bin/rails questionnaires:elm`) into the
  # FHIR Library resources in db/questionnaires/libraries; cql/run.mjs executes
  # it with cqframework's cql-execution and cql-exec-fhir.
  class Cql
    class Error < StandardError; end

    LIBRARIES = Rails.root.join("db/questionnaires/libraries")
    # cql/run.mjs and the engine in one file (bin/rails questionnaires:runner).
    RUNNER = Rails.root.join("cql/dist/run.cjs")
    TIMEOUT = 20

    # { "NoraCommon" => <ELM JSON>, ... }
    def self.elm
      @elm ||= LIBRARIES.glob("*.json").to_h do |path|
        library = JSON.parse(path.read)
        content = library.fetch("content").find { |c| c["contentType"] == "application/elm+json" }
        [ library["name"], JSON.parse(Base64.decode64(content.fetch("data"))) ]
      end
    end

    # @param library [String] the question set's library, e.g. "NoraFepSaxenda"
    # @param resources [Array<Hash>] the patient's FHIR resources
    # @param libraries [Hash{String => Hash}, nil] ELM to run instead of
    #   Nora's own, e.g. what a payer's DTR package carried (Dtr::Package.elm)
    # @return [Hash{String => Object}] every expression's value
    def self.call(library:, resources:, as_of:, libraries: nil)
      input = { libraries: (libraries || elm).values, main: library, parameters: { AsOf: as_of.iso8601 },
                bundle: { resourceType: "Bundle", type: "collection", entry: resources.map { |r| { resource: r } } } }
      out, err, status = Open3.capture3(ENV.fetch("NODE_BINARY", "node"), RUNNER.to_s, stdin_data: JSON.generate(input),
                                        chdir: RUNNER.dirname.to_s)
      raise Error, "CQL did not run: #{err.lines.grep(/\AError/).last&.strip || err.lines.last&.strip}" unless status.success?

      JSON.parse(out).fetch("results")
    rescue Errno::ENOENT
      raise Error, "CQL did not run: Node.js is not installed"
    end
  end
end
