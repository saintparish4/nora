require "digest"
require "json"
require "open3"
require "timeout"
require "yaml"
require "active_support/testing/time_helpers"

# The evidence eval: does Authorizations::EvidenceExtractionService propose the
# right chart text for each payer criterion, and stay quiet when the chart does
# not support one?
#
# A case is one request: a synthetic chart, a medication, and a plan. Its
# expected answers were written by a person reading the chart, never by running
# the service. See README.md in this directory for how to run it and what the
# numbers mean.
module EvidenceEval
  ROOT = Pathname.new(__dir__)
  CASES_DIR = ROOT.join("cases")
  STATE_PATH = ROOT.join("state.json")

  LABELS = %w[supported unsupported not_applicable ambiguous].freeze
  # Labels that take no part in the score. They are still recorded in traces.
  EXCLUDED = %w[not_applicable ambiguous].freeze
  SYSTEMS = %w[real oracle null everything].freeze
  ERROR_CLASSES = %w[timeout infrastructure truncated harness version_mismatch].freeze
  PER_CASE_CEILING = 180 # seconds, wall clock
  SCRATCH_DATABASE = "storage/eval.sqlite3".freeze

  class HarnessError < StandardError; end

  # A classified failure of one attempt. It goes to errors.jsonl, never to the
  # score.
  class AttemptError < StandardError
    attr_reader :error_class

    def initialize(error_class, detail)
      @error_class = error_class
      super(detail)
    end
  end

  Span = Struct.new(:document, :start, :finish) do
    def overlaps?(other)
      document == other.document && start < other.finish && other.start < finish
    end
  end

  # One excerpt a system put forward for one criterion.
  Proposal = Struct.new(:position, :span, :source, :confidence, :excerpt, keyword_init: true)

  # --- Cases ----------------------------------------------------------------

  class Case
    attr_reader :id, :tags, :as_of, :item, :coverage, :patient, :documents, :expected, :path

    def self.load_all(only: nil)
      cases = CASES_DIR.glob("*.yml").sort.map { |path| new(path) }
      ids = cases.map(&:id)
      raise HarnessError, "duplicate case ids: #{ids.tally.select { |_, n| n > 1 }.keys.join(', ')}" if ids.uniq.size != ids.size

      return cases if only.blank?

      unknown = only - ids
      raise HarnessError, "unknown case ids: #{unknown.join(', ')}" if unknown.any?

      cases.select { |c| only.include?(c.id) }
    end

    def initialize(path)
      @path = path
      raw = YAML.safe_load_file(path, permitted_classes: [ Date ])
      @id = raw.fetch("id")
      @tags = raw.fetch("tags")
      @as_of = raw.fetch("as_of")
      @item = raw.fetch("item")
      @coverage = raw.fetch("coverage")
      @patient = raw.fetch("patient")
      @documents = raw.fetch("documents").map.with_index do |doc, index|
        # Normalised exactly as ChartDocument normalises a body, so offsets
        # computed here are offsets into what the service reads.
        doc.merge("key" => index, "body" => doc.fetch("body").gsub("\r\n", "\n").strip)
      end
      @expected = raw.fetch("expected").to_h { |position, entry| [ Integer(position), entry ] }
      validate!
    rescue KeyError, Psych::Exception => e
      raise HarnessError, "#{path.basename}: #{e.message}"
    end

    def label(position) = expected.fetch(position).fetch("label")

    def spans(position, kind)
      Array(expected.fetch(position)[kind]).flat_map { |quote| locate(quote, position) }
    end

    def positions(with_label) = expected.keys.select { |p| label(p) == with_label }

    private

    def validate!
      expected.each do |position, entry|
        label = entry["label"]
        fail_case "criterion #{position}: unknown label #{label.inspect}" unless LABELS.include?(label)
        fail_case "criterion #{position}: a supported label needs at least one support quote" if label == "supported" && Array(entry["support"]).empty?
        fail_case "criterion #{position}: only a supported label may list support quotes" if label != "supported" && entry["support"]
        fail_case "criterion #{position}: explain why" if label != "supported" && entry["why"].blank?
        spans(position, "support")
        spans(position, "traps")
      end
    end

    # Every occurrence of the quote, in any document of the case. A quote that
    # is not in the chart word for word is a labelling mistake.
    def locate(quote, position)
      found = documents.flat_map do |doc|
        offsets = []
        from = 0
        while (index = doc["body"].index(quote, from))
          offsets << Span.new(doc["key"], index, index + quote.length)
          from = index + 1
        end
        offsets
      end
      fail_case "criterion #{position}: quote not found in any document: #{quote.inspect}" if found.empty?
      found
    end

    def fail_case(message) = raise(HarnessError, "#{path.basename}: #{message}")
  end

  # --- Grading --------------------------------------------------------------

  # Pure: expected answers and proposals in, grades out. The real service and
  # the self-check systems are all graded through here.
  module Grader
    module_function

    # @return [Hash] :grade (the per-case metrics), :counts, :requirements
    def call(eval_case, proposals)
      requirements = eval_case.expected.keys.sort.map { |position| requirement(eval_case, position, proposals) }
      supported = requirements.select { |r| r[:label] == "supported" }
      unsupported = requirements.select { |r| r[:label] == "unsupported" }
      scored = requirements.reject { |r| EXCLUDED.include?(r[:label]) }
      excerpts = scored.flat_map { |r| r[:proposals] }
      good = excerpts.count { |p| p[:verdict] == "support" }

      {
        grade: {
          # Of the requirements the chart does not support, the share where
          # nothing was proposed.
          "clean" => ratio(unsupported.count { |r| r[:proposals].empty? }, unsupported.size),
          # Of the requirements the chart supports, the share where at least
          # one proposed excerpt is a supporting one.
          "found" => ratio(supported.count { |r| r[:found] }, supported.size),
          # Of everything proposed on scored requirements, the share that
          # supports its criterion.
          "precision" => ratio(good, excerpts.size)
        },
        counts: {
          "supported" => supported.size, "unsupported" => unsupported.size,
          "excluded" => requirements.size - scored.size,
          "proposals" => excerpts.size, "good" => good,
          "false_proposals" => unsupported.sum { |r| r[:proposals].size }
        },
        requirements: requirements
      }
    end

    def requirement(eval_case, position, proposals)
      label = eval_case.label(position)
      support = eval_case.spans(position, "support")
      traps = eval_case.spans(position, "traps")
      mine = proposals.select { |p| p.position == position }.map do |proposal|
        verdict =
          if EXCLUDED.include?(label) then "unscored"
          elsif label == "unsupported" then traps.any? { |t| t.overlaps?(proposal.span) } ? "trap" : "false"
          elsif support.any? { |s| s.overlaps?(proposal.span) } then "support"
          else "noise"
          end
        { document: proposal.span.document, start: proposal.span.start, finish: proposal.span.finish,
          source: proposal.source, confidence: proposal.confidence, excerpt: proposal.excerpt, verdict: verdict }
      end
      { position: position, label: label, why: eval_case.expected.fetch(position)["why"],
        found: label == "supported" ? mine.any? { |p| p[:verdict] == "support" } : nil, proposals: mine }
    end

    def ratio(numerator, denominator) = denominator.zero? ? nil : (numerator.to_f / denominator).round(4)
  end

  # --- Systems that are not the real one, for proving the harness -----------

  module SelfCheck
    module_function

    # Proposes exactly the supporting text. Must score 1.0 on every metric.
    def oracle(eval_case)
      eval_case.positions("supported").flat_map do |position|
        eval_case.spans(position, "support").map { |span| proposal(eval_case, position, span, "oracle") }
      end
    end

    # Proposes nothing. Must score found 0 and clean 1: finding nothing is not
    # the same as being right.
    def null(_eval_case) = []

    # Proposes every line of every document for every criterion. Must score
    # found 1 and clean 0.
    def everything(eval_case)
      eval_case.expected.keys.flat_map do |position|
        eval_case.documents.flat_map do |doc|
          offset = 0
          doc["body"].each_line.filter_map do |line|
            start = offset
            offset += line.length
            next if line.strip.empty?

            proposal(eval_case, position, Span.new(doc["key"], start, start + line.chomp.length), "everything")
          end
        end
      end
    end

    def proposal(eval_case, position, span, source)
      body = eval_case.documents.fetch(span.document)["body"]
      Proposal.new(position: position, span: span, source: source, confidence: nil, excerpt: body[span.start...span.finish])
    end
  end

  # Wraps the OpenAI SDK that Ai::Client would build, so the run can record what
  # the provider actually served: model id, token usage, and why it stopped.
  # Ai::Client and its prompt are untouched.
  class RecordingSdk
    attr_reader :calls

    def initialize(inner)
      @inner = inner
      @calls = []
    end

    def chat(parameters:)
      response = @inner.chat(parameters: parameters)
      @calls << {
        "requested_model" => parameters[:model],
        "served_model" => response["model"],
        "finish_reason" => response.dig("choices", 0, "finish_reason"),
        "prompt_tokens" => response.dig("usage", "prompt_tokens"),
        "completion_tokens" => response.dig("usage", "completion_tokens")
      }
      response
    end
  end

  # --- The policy library, pinned -------------------------------------------

  module Library
    module_function

    def template_for(eval_case)
      payer = Payer.find_by(name: eval_case.coverage.fetch("payer")) or raise(HarnessError, "#{eval_case.id}: unknown payer")
      PolicyTemplate.resolve(item_name: eval_case.item, payer: payer) or raise(HarnessError, "#{eval_case.id}: no criteria for #{eval_case.item}")
    end

    # A digest of every criterion the cases depend on: text, kind, and the hint
    # that drives the rule pass. Labels were written against one library; a
    # different one means the labels have to be read again.
    def digest(cases)
      payload = cases.map { |c| template_for(c) }.uniq.sort_by(&:id).map do |template|
        [ template.title, template.criteria.map { |c| [ c.position, c.kind, c.text, c.optional, c.hint ] } ]
      end
      Digest::SHA256.hexdigest(JSON.generate(payload))[0, 16]
    end

    def check_labels_cover_criteria!(cases)
      cases.each do |eval_case|
        positions = template_for(eval_case).criteria.map(&:position).sort
        next if positions == eval_case.expected.keys.sort

        raise HarnessError, "#{eval_case.id}: labels cover criteria #{eval_case.expected.keys.sort} but the policy has #{positions}"
      end
    end
  end

  # --- The run --------------------------------------------------------------

  class Runner
    include ActiveSupport::Testing::TimeHelpers

    # @param round [String] output directory under the eval root
    # @param system [String] "real", or a self-check system
    # @param model [Boolean] run the model pass (costs money; real system only)
    # @param ablate [String, nil] "hints" removes every rule hint, to show the
    #   score depends on them
    # @param sdk_factory [#call, nil] builds the SDK the model pass talks to.
    #   Only the self-check passes one, to rehearse failures without a key.
    def initialize(round:, system: "real", model: false, reps: 1, only: nil, ablate: nil, sdk_factory: nil, out: $stdout)
      raise HarnessError, "unknown system #{system.inspect}" unless SYSTEMS.include?(system)
      raise HarnessError, "the model pass only applies to the real system" if model && system != "real"

      @round = round
      @system = system
      @model = model
      @reps = reps
      @ablate = ablate
      @sdk_factory = sdk_factory || -> { OpenAI::Client.new(request_timeout: Ai::Client::DEFAULT_TIMEOUT) }
      @out = out
      @subset = only.present?
      @cases = Case.load_all(only: only)
      @dir = ROOT.join(round)
      @served_models = []
    end

    def call
      prepare_database
      Library.check_labels_cover_criteria!(@cases)
      check_library_matches_labels!
      ablate_hints! if @ablate == "hints"
      @dir.join("traces").mkpath
      write_fingerprint
      announce

      done = existing_rows
      @cases.product((0...@reps).to_a).each do |eval_case, rep|
        next @out.puts("  skip #{eval_case.id} rep #{rep} (already recorded)") if done.include?([ eval_case.id, rep ])

        attempt(eval_case, rep)
      end
      write_fingerprint
      @dir
    end

    private

    # A scratch SQLite database, deleted and rebuilt from schema.rb on every
    # run, so the eval never reads or locks development or test data and no
    # run sees rows from the one before.
    def prepare_database
      raise HarnessError, "refusing to run in production" if Rails.env.production?

      path = Rails.root.join(SCRATCH_DATABASE)
      ActiveRecord::Base.connection_handler.clear_all_connections!
      Dir.glob("#{path}*").each { |file| File.delete(file) }
      ActiveRecord::Base.establish_connection(adapter: "sqlite3", database: path.to_s, timeout: 5000)
      ActiveRecord::Schema.verbose = false
      quietly do
        load Rails.root.join("db/schema.rb")
        load Rails.root.join("db/seeds/policy_library.rb")
      end
      ActiveModel::SecurePassword.min_cost = true
      @organization = Organization.create!(name: "Evidence eval")
      @staff = member("staff")
      @clinician = member("clinician")
    end

    def member(role)
      User.create!(organization: @organization, role: role, email: "#{role}@eval.invalid", first_name: "Eval", last_name: role.capitalize,
                   password: "not-a-real-login", password_confirmation: "not-a-real-login")
    end

    def check_library_matches_labels!
      @library_digest = Library.digest(@cases)
      pinned = state["criteria_digest"]
      # A subset touches fewer policies, so its digest is not comparable.
      return if pinned.nil? || pinned == @library_digest || @subset

      raise HarnessError, "the policy library changed since the labels were written (#{pinned} -> #{@library_digest}). " \
                          "Re-read the labels against the new criteria, then update criteria_digest in state.json."
    end

    def ablate_hints!
      PolicyCriterion.update_all(hint: {})
    end

    def state = @state ||= STATE_PATH.exist? ? JSON.parse(STATE_PATH.read) : {}

    def announce
      @out.puts "evidence eval: #{@cases.size} cases x #{@reps} rep(s), system=#{@system}, model pass=#{@model ? requested_model : 'off'}" \
                "#{@ablate ? ", ablated=#{@ablate}" : ''} -> #{@dir.relative_path_from(Rails.root)}"
    end

    def requested_model = ENV.fetch("OPENAI_MODEL", Ai::Client::DEFAULT_MODEL)

    def existing_rows
      path = @dir.join("results.jsonl")
      return Set.new unless path.exist?

      path.readlines.map { |line| JSON.parse(line) }.to_set { |row| [ row["case_id"], row["rep"] ] }
    end

    def attempt(eval_case, rep)
      started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      outcome = Timeout.timeout(PER_CASE_CEILING) { run_system(eval_case) }
      elapsed = (Process.clock_gettime(Process::CLOCK_MONOTONIC) - started).round(3)
      graded = Grader.call(eval_case, outcome[:proposals])
      graded[:grade]["verbatim"] = outcome[:verbatim]

      write_trace(eval_case, rep, outcome, graded)
      append("results.jsonl", {
        case_id: eval_case.id, rep: rep, tags: eval_case.tags, status: "ok", grade: graded[:grade], counts: graded[:counts],
        latency_s: elapsed, tokens: outcome[:tokens], ran: ran.merge(served_model: outcome[:served_model])
      })
      @out.puts "  ok   #{eval_case.id} rep #{rep}: " + graded[:grade].map { |k, v| "#{k}=#{v.nil? ? '-' : v}" }.join(" ")
    rescue Timeout::Error
      record_error(eval_case, rep, "timeout", "wall-clock ceiling #{PER_CASE_CEILING} s")
    rescue AttemptError => e
      record_error(eval_case, rep, e.error_class, e.message)
    rescue HarnessError
      raise
    rescue StandardError => e
      record_error(eval_case, rep, "harness", "#{e.class}: #{e.message}")
    end

    def record_error(eval_case, rep, error_class, detail)
      append("errors.jsonl", { case_id: eval_case.id, rep: rep, class: error_class, attempts: 1, detail: detail })
      @out.puts "  ERR  #{eval_case.id} rep #{rep}: #{error_class}: #{detail}"
    end

    def run_system(eval_case)
      return { proposals: SelfCheck.public_send(@system, eval_case), verbatim: 1, tokens: nil, served_model: nil, system_state: nil } unless @system == "real"

      run_real(eval_case)
    end

    # The real entry point: build the request the way the app does, then call
    # the service the extraction job calls. Everything is rolled back after.
    def run_real(eval_case)
      outcome = nil
      ActiveRecord::Base.transaction(requires_new: true) do
        request, documents = build_request(eval_case)
        sdk = @model ? RecordingSdk.new(@sdk_factory.call) : nil
        Authorizations::EvidenceExtractionService.call(request, actor: @staff, model_pass: @model, ai_client: sdk && Ai::Client.new(sdk: sdk))
        request.reload
        outcome = read_outcome(request, documents, sdk)
        raise ActiveRecord::Rollback
      end
      outcome
    end

    def build_request(eval_case)
      patient = @organization.patients.create!(eval_case.patient)
      plan = InsurancePlan.joins(:payer).find_by!(payers: { name: eval_case.coverage.fetch("payer") }, name: eval_case.coverage.fetch("plan"))
      coverage = patient.coverages.create!(insurance_plan: plan, member_id: eval_case.coverage.fetch("member_id"))
      documents = eval_case.documents.to_h do |doc|
        record = patient.chart_documents.create!(organization: @organization, uploaded_by: @staff, source: "paste",
                                                 kind: doc.fetch("kind"), title: doc.fetch("title"), occurred_on: doc.fetch("occurred_on"), body: doc.fetch("body"))
        raise HarnessError, "#{eval_case.id}: stored body differs from the case file" unless record.body == doc["body"]

        [ record.id, doc["key"] ]
      end
      # The request is opened on the case's date, so "the last six months"
      # means the same thing on every run.
      request = travel_to(eval_case.as_of.in_time_zone(@organization.timezone).change(hour: 12)) do
        Authorizations::CreateService.call(organization: @organization, actor: @staff, patient: patient, coverage: coverage,
                                           item_name: eval_case.item, requested_by: @clinician, assigned_to: @staff)
      end
      [ request, documents ]
    end

    def read_outcome(request, documents, sdk)
      check_model_ran!(request, sdk) if @model

      requirements = request.requirements.includes(:policy_criterion, evidence: :chart_document)
      proposals = requirements.flat_map do |requirement|
        requirement.evidence.reject(&:rejected?).map do |evidence|
          Proposal.new(position: requirement.policy_criterion.position,
                       span: Span.new(documents.fetch(evidence.chart_document_id), evidence.start_offset, evidence.end_offset),
                       source: evidence.extracted_by, confidence: evidence.confidence&.to_f, excerpt: evidence.excerpt)
        end
      end
      verbatim = requirements.flat_map(&:evidence).all? { |e| e.chart_document.body[e.start_offset...e.end_offset] == e.excerpt }

      {
        proposals: proposals, verbatim: verbatim ? 1 : 0,
        tokens: sdk && { "prompt" => sdk.calls.sum { |c| c["prompt_tokens"].to_i }, "completion" => sdk.calls.sum { |c| c["completion_tokens"].to_i }, "calls" => sdk.calls.size },
        served_model: sdk&.calls&.map { |c| c["served_model"] }&.uniq&.join(","),
        system_state: {
          "extraction_status" => request.extraction_status, "extraction_error" => request.extraction_error, "request_status" => request.status,
          "requirement_statuses" => requirements.to_h { |r| [ r.policy_criterion.position, r.status ] },
          "model_summaries" => requirements.to_h { |r| [ r.policy_criterion.position, r.ai_summary ] }.compact,
          "extraction_event" => request.workflow_events.where(event_type: %w[extraction_succeeded extraction_failed]).last&.payload,
          "model_calls" => sdk&.calls
        }
      }
    end

    # The service fails closed: when the model errors it keeps the rule
    # evidence and carries on. For the app that is right. For an eval of the
    # model pass it would score an outage as a result, so it is an error here.
    def check_model_ran!(request, sdk)
      raise AttemptError.new("truncated", "the model stopped at the length limit") if sdk.calls.any? { |c| c["finish_reason"] == "length" }
      raise AttemptError.new("infrastructure", request.extraction_error.to_s) if request.extraction_status != "succeeded" || request.extraction_error.present?
      raise AttemptError.new("infrastructure", "the model was never called") if sdk.calls.empty?

      served = sdk.calls.map { |c| c["served_model"].to_s }.uniq
      @served_models |= served
      wrong = served.reject { |name| name.start_with?(requested_model) }
      raise AttemptError.new("version_mismatch", "asked for #{requested_model}, served #{wrong.join(', ')}") if wrong.any?
    end

    def write_trace(eval_case, rep, outcome, graded)
      trace = {
        case_id: eval_case.id, rep: rep, tags: eval_case.tags, as_of: eval_case.as_of, item: eval_case.item, coverage: eval_case.coverage,
        documents: eval_case.documents.map { |d| d.slice("key", "title", "kind", "occurred_on", "body") },
        criteria: criteria_for(eval_case), requirements: graded[:requirements], grade: graded[:grade], counts: graded[:counts],
        system_state: outcome[:system_state], ran: ran
      }
      @dir.join("traces", "#{eval_case.id}_rep#{rep}.json").write(JSON.pretty_generate(trace))
    end

    def criteria_for(eval_case)
      Library.template_for(eval_case).criteria.to_h { |c| [ c.position, { "text" => c.text, "kind" => c.kind, "optional" => c.optional, "hint" => c.hint } ] }
    end

    def append(name, row)
      File.open(@dir.join(name), "a") { |file| file.puts(JSON.generate(row)) }
    end

    def ran
      @ran ||= {
        commit: git("rev-parse", "--short", "HEAD"),
        # Uncommitted edits to the service or the policy library: the commit
        # alone would not say what ran.
        dirty: git("status", "--porcelain", "--", "app", "db/seeds/policy_library.rb").present?,
        system: @system, model_pass: @model ? requested_model : "off", ablate: @ablate, criteria_digest: @library_digest
      }
    end

    def git(*arguments)
      Open3.capture2("git", "-C", Rails.root.to_s, *arguments).first.strip
    end

    def write_fingerprint
      @dir.join("fingerprint.json").write(JSON.pretty_generate(ran.merge(
        prompt_digest: Digest::SHA256.hexdigest(Authorizations::EvidenceExtractionService::SYSTEM_PROMPT)[0, 16],
        harness_digest: Digest::SHA256.hexdigest(([ ROOT.join("harness.rb") ] + CASES_DIR.glob("*.yml").sort).map(&:read).join)[0, 16],
        served_models: @served_models, ruby: RUBY_VERSION, rails: Rails.version, cases: @cases.size, reps: @reps
      )))
    end

    def quietly
      original = $stdout
      $stdout = StringIO.new
      yield
    ensure
      $stdout = original
    end
  end
end
