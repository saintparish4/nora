# The evidence eval. See evals/evidence/README.md.
#
#   bin/rails eval:evidence                      rule pass, written to evals/evidence/baseline
#   bin/rails eval:evidence ROUND=v1             a later round, after a change
#   bin/rails eval:evidence:selfcheck            prove the harness (oracle, null, everything, no hints)
#   bin/rails eval:evidence MODEL=on CONFIRM_SPEND=yes ROUND=model_baseline REPS=3
#   bin/rails eval:evidence:review               regenerate REVIEW.md (every case and its labels)
#   bin/rails eval:evidence:graded ROUND=baseline  write GRADED.md (graded examples from the train slice)
namespace :eval do
  desc "Run the evidence eval (ROUND, SYSTEM, MODEL=on, REPS, CASES=id,id)"
  task evidence: :environment do
    require Rails.root.join("evals/evidence/harness")
    model = ENV["MODEL"] == "on"
    if model
      abort "MODEL=on needs OPENAI_API_KEY." unless Ai::Client.configured?
      abort "MODEL=on sends the synthetic charts to the model and costs money. Run a few cases first (CASES=...), then repeat with CONFIRM_SPEND=yes." unless ENV["CONFIRM_SPEND"] == "yes" || ENV["CASES"].present?
    end

    EvidenceEval::Runner.new(
      round: ENV.fetch("ROUND", "baseline"), system: ENV.fetch("SYSTEM", "real"), model: model,
      reps: Integer(ENV.fetch("REPS", "1")), only: ENV["CASES"]&.split(","), ablate: ENV["ABLATE"]
    ).call
  rescue EvidenceEval::HarnessError => e
    abort "evidence eval stopped: #{e.message}"
  end

  namespace :evidence do
    desc "Prove the harness: a perfect answer, an empty answer, an answer of everything, and the rules switched off"
    task selfcheck: :environment do
      require Rails.root.join("evals/evidence/harness")
      runs = { "selfcheck_oracle" => { system: "oracle" }, "selfcheck_null" => { system: "null" },
               "selfcheck_everything" => { system: "everything" }, "selfcheck_no_hints" => { system: "real", ablate: "hints" } }
      runs.each do |round, options|
        FileUtils.rm_rf(EvidenceEval::ROOT.join(round))
        EvidenceEval::Runner.new(round: round, out: StringIO.new, **options).call
      end

      mean = lambda do |round, metric|
        values = EvidenceEval::ROOT.join(round, "results.jsonl").readlines.filter_map { |line| JSON.parse(line).dig("grade", metric) }
        values.empty? ? nil : (values.sum / values.size).round(3)
      end
      expected = {
        "selfcheck_oracle" => { "found" => 1.0, "clean" => 1.0, "precision" => 1.0 },
        "selfcheck_null" => { "found" => 0.0, "clean" => 1.0 },
        "selfcheck_everything" => { "found" => 1.0, "clean" => 0.0 },
        "selfcheck_no_hints" => { "found" => 0.0, "clean" => 1.0 }
      }
      failed = false
      expected.each do |round, metrics|
        metrics.each do |metric, want|
          got = mean.call(round, metric)
          ok = got == want
          failed ||= !ok
          puts format("%-4s %-22s %-10s want %.1f got %s", ok ? "ok" : "FAIL", round, metric, want, got.inspect)
        end
      end

      # The model pass, rehearsed with stand-in SDKs: no key, no network, no
      # cost. An outage, a cut-off answer, and a substituted model must each
      # land in errors.jsonl and never as a score; a real-looking answer must
      # be recorded with its source and graded.
      reply = lambda do |content, model: Ai::Client::DEFAULT_MODEL, finish: "stop"|
        { "model" => model, "choices" => [ { "message" => { "content" => content }, "finish_reason" => finish } ],
          "usage" => { "prompt_tokens" => 900, "completion_tokens" => 60 } }
      end
      false_quote = JSON.generate("criteria" => [ { "criterion_id" => "C6", "summary" => "stand-in",
                                                    "findings" => [ { "document_id" => "D2", "quote" => "Sertraline 50 mg tablets, filled monthly.", "confidence" => 0.9 } ] } ])
      stand_ins = {
        "outage" => [ Class.new { def chat(parameters:) = raise(Faraday::TimeoutError, "stand-in timeout") }, "infrastructure" ],
        "cut_off" => [ Class.new { define_method(:chat) { |parameters:| reply.call('{"criteria": [', finish: "length") } }, "truncated" ],
        "wrong_model" => [ Class.new { define_method(:chat) { |parameters:| reply.call('{"criteria": []}', model: "some-other-model") } }, "version_mismatch" ],
        "false_quote" => [ Class.new { define_method(:chat) { |parameters:| reply.call(false_quote) } }, nil ]
      }
      stand_ins.each do |name, (sdk, error_class)|
        round = "selfcheck_model_#{name}"
        dir = EvidenceEval::ROOT.join(round)
        FileUtils.rm_rf(dir)
        EvidenceEval::Runner.new(round: round, model: true, only: [ "fill_only_pharmacy_record" ], sdk_factory: -> { sdk.new }, out: StringIO.new).call
        rows = dir.join("results.jsonl").exist? ? dir.join("results.jsonl").readlines.map { |line| JSON.parse(line) } : []
        errors = dir.join("errors.jsonl").exist? ? dir.join("errors.jsonl").readlines.map { |line| JSON.parse(line) } : []
        ok =
          if error_class
            rows.empty? && errors.map { |e| e["class"] } == [ error_class ]
          else
            trace = JSON.parse(dir.join("traces", "fill_only_pharmacy_record_rep0.json").read)
            from_model = trace["requirements"].flat_map { |r| r["proposals"] }.select { |pr| pr["source"] == "ai" }
            errors.empty? && rows.size == 1 && rows.first.dig("tokens", "prompt") == 900 && rows.first.dig("ran", "served_model") == Ai::Client::DEFAULT_MODEL &&
              from_model.map { |pr| pr["verdict"] } == [ "false" ] && rows.first.dig("grade", "clean") < 1.0
          end
        failed ||= !ok
        puts format("%-4s %-30s %s", ok ? "ok" : "FAIL", round, error_class ? "lands in errors.jsonl as #{error_class}, no score" : "model excerpt recorded, sourced, and graded as a false proposal")
      end

      abort "The harness does not grade known answers correctly. Do not trust any score until this passes." if failed
    rescue EvidenceEval::HarnessError => e
      abort "evidence eval stopped: #{e.message}"
    end

    desc "Write REVIEW.md: every case, its chart, and its labels, for the owner to sign off"
    task review: :environment do
      require Rails.root.join("evals/evidence/harness")
      require Rails.root.join("evals/evidence/report")
      EvidenceEval::Report.review
    end

    desc "Write GRADED.md: graded examples from the train slice of ROUND, for the owner to check the grading"
    task graded: :environment do
      require Rails.root.join("evals/evidence/harness")
      require Rails.root.join("evals/evidence/report")
      EvidenceEval::Report.graded(ENV.fetch("ROUND", "baseline"))
    end

    desc "Summarise ROUND from its per-case rows: totals by criterion and by source"
    task summary: :environment do
      require Rails.root.join("evals/evidence/harness")
      require Rails.root.join("evals/evidence/report")
      EvidenceEval::Report.summary(ENV.fetch("ROUND", "baseline"))
    end
  end
end
