module EvidenceEval
  # Rounds built from other rounds' excerpts instead of a fresh run, so that
  # conditions which differ only in how rule and model excerpts are combined
  # are compared on identical model output (PLAN-2026-10-22.md). Every derived
  # round is graded by the same Grader as a real run.
  module Derive
    module_function

    CONDITIONS = %w[rules_plus_model gated filtered external].freeze

    # @param condition [String] one of CONDITIONS
    # @param round [String] the directory to write
    # @param rules [String] a rule-only round (one rep)
    # @param model [String, nil] a model-alone round (ABLATE=hints)
    # @param keep [String, nil] JSONL from nora_context.py filter
    # @param proposals [String, nil] JSONL from nora_context.py baseline
    def call(condition:, round:, rules: "rules", model: nil, keep: nil, proposals: nil, out: $stdout)
      raise HarnessError, "unknown condition #{condition}" unless CONDITIONS.include?(condition)

      dir = ROOT.join(round)
      raise HarnessError, "#{round} already exists; derived rounds are written once" if dir.exist?

      cases = Case.load_all.index_by(&:id)
      rule_traces = traces(rules, rep: 0)
      model_reps = condition == "external" ? [ 0 ] : reps(model)
      kept = keep && read_jsonl(keep).to_h { |k| [ k.values_at("case_id", "rep", "position", "document", "start", "finish"), k["keep"] ] }
      external = proposals && read_jsonl(proposals).group_by { |p| p["case_id"] }

      dir.join("traces").mkpath
      model_reps.each do |rep|
        model_traces = condition == "external" ? {} : traces(model, rep: rep)
        cases.each_value do |eval_case|
          rule_trace = rule_traces.fetch(eval_case.id)
          combined =
            case condition
            when "external"
              dedupe(Array(external&.dig(eval_case.id)).map { |p| proposal(eval_case, p.merge("source" => "medspacy")) })
            else
              from_rules = excerpts(eval_case, rule_trace)
              from_model = excerpts(eval_case, model_traces.fetch(eval_case.id)).select { |p| p.source == "ai" }
              from_model = gate(from_model, from_rules) if condition == "gated"
              from_model = from_model.select { |p| kept.fetch([ eval_case.id, rep, p.position, p.span.document, p.span.start, p.span.finish ]) } if condition == "filtered"
              dedupe(from_rules + from_model)
            end

          graded = Grader.call(eval_case, combined)
          graded[:grade]["verbatim"] = combined.all? { |p| eval_case.documents.fetch(p.span.document)["body"][p.span.start...p.span.finish] == p.excerpt } ? 1 : 0
          ran = { "derived" => condition, "rules" => rules, "model" => model, "keep" => keep && File.basename(keep), "proposals" => proposals && File.basename(proposals),
                  "commit" => `git -C #{Rails.root} rev-parse --short HEAD`.strip, "criteria_digest" => rule_trace.dig("ran", "criteria_digest") }
          dir.join("traces", "#{eval_case.id}_rep#{rep}.json").write(JSON.pretty_generate(
            rule_trace.slice("case_id", "tags", "as_of", "item", "coverage", "documents", "criteria").merge(
              "rep" => rep, "requirements" => graded[:requirements], "grade" => graded[:grade], "counts" => graded[:counts], "ran" => ran
            )
          ))
          File.open(dir.join("results.jsonl"), "a") do |file|
            file.puts(JSON.generate(case_id: eval_case.id, rep: rep, tags: eval_case.tags, status: "ok", grade: graded[:grade], counts: graded[:counts],
                                    latency_s: nil, tokens: nil, ran: ran))
          end
        end
      end
      dir.join("fingerprint.json").write(JSON.pretty_generate(derived: condition, rules: rules, model: model, keep: keep && File.basename(keep),
                                                              proposals: proposals && File.basename(proposals), cases: cases.size, reps: model_reps.size))
      out.puts "#{round}: #{condition}, #{cases.size} cases x #{model_reps.size} rep(s)"
    end

    # Model excerpts only on criteria where the rules proposed nothing.
    def gate(from_model, from_rules)
      covered = from_rules.map(&:position).to_set
      from_model.reject { |p| covered.include?(p.position) }
    end

    # The service's rule (add_evidence): an excerpt overlapping one already
    # kept for the same criterion and document is dropped. Earlier wins, and
    # rule excerpts come first.
    def dedupe(proposals)
      proposals.each_with_object([]) do |p, kept|
        kept << p unless kept.any? { |k| k.position == p.position && k.span.overlaps?(p.span) }
      end
    end

    def excerpts(eval_case, trace)
      trace.fetch("requirements").flat_map do |requirement|
        requirement.fetch("proposals").map { |p| proposal(eval_case, p.merge("position" => requirement["position"])) }
      end
    end

    def proposal(eval_case, raw)
      span = Span.new(raw.fetch("document"), raw.fetch("start"), raw.fetch("finish"))
      body = eval_case.documents.fetch(span.document)["body"]
      Proposal.new(position: raw.fetch("position"), span: span, source: raw.fetch("source"), confidence: raw["confidence"],
                   excerpt: raw["excerpt"] || body[span.start...span.finish])
    end

    def traces(round, rep:)
      found = ROOT.join(round, "traces").glob("*_rep#{rep}.json").to_h { |path| t = JSON.parse(path.read); [ t["case_id"], t ] }
      raise HarnessError, "no rep #{rep} traces under #{round}" if found.empty?

      found
    end

    def reps(round) = ROOT.join(round, "traces").glob("*.json").map { |p| Integer(p.basename(".json").to_s.split("_rep").last) }.uniq.sort

    def read_jsonl(path) = File.readlines(path).map { |line| JSON.parse(line) }
  end
end
