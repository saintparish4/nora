# Independent labels for the request-form eval. See labeling/README.md.
#
# Packet writes what a labeller needs: each case's chart as staff would see it
# (structured data and the visit notes) and the plan's questions, with none of
# Nora's answers, explanations, or the existing labels. Agreement reads the
# filled answer sheets and reports Cohen's kappa against the eval's labels and
# between labellers, and lists every disagreement to resolve.
require "csv"
require "erb"
require Rails.root.join("evals/request_form/harness")

module RequestFormEval
  LABELING = ROOT.join("labeling")

  # The hidden branching facts, in words a labeller can check in the chart.
  CONDITION_WORDS = {
    "age-group" => { "12-17" => "the patient is 12 to 17", "18-plus" => "the patient is 18 or older" },
    "plan-option" => { "focus" => "the plan is FEP Blue Focus", "standard-basic" => "the plan is FEP Blue Standard or Blue Basic" },
    "dosage-form" => { "injection" => "the prescription is for pens", "tablet" => "the prescription is for tablets" }
  }.freeze

  # The request numbers labellers see. Case ids would hint at the answers.
  def self.requests = spec.fetch("cases").each_with_index.to_h { |kase, i| [ format("R%02d", i + 1), kase ] }

  def self.question_set(kase) = RequestForm::QuestionSet.for(payer: kase["payer"], item: kase["item"])

  # The eval's label for a question, in the answer sheet's vocabulary.
  def self.reference_answer(kase, link_id)
    value = kase.fetch("answers")[link_id]
    case value
    when nil then "n/a"
    when "ask", "check" then "ask"
    else Array(value).map(&:to_s).sort.join(";")
    end
  end

  # The visit notes seeded for the demo patients, read from the seed file
  # without loading it: { "demo-1001" => [{ title:, occurred_on:, body: }] }.
  def self.seeded_notes
    @seeded_notes ||= begin
      notes = Hash.new { |h, k| h[k] = [] }
      mrn = nil
      lines = Rails.root.join("db/seeds/synthetic_charts.rb").readlines
      i = 0
      while i < lines.size
        line = lines[i]
        mrn = line[/mrn: "(DEMO-\d+)"/, 1] || mrn
        if (doc = line.match(/title: "([^"]+)", occurred_on: "([^"]+)", body: <<~NOTE/))
          body = []
          i += 1
          body << lines[i] and i += 1 until lines[i].strip == "NOTE"
          notes[mrn.downcase] << { title: doc[1], occurred_on: doc[2], body: body.join.gsub(/^ {8}/, "").strip }
        end
        i += 1
      end
      notes
    end
  end

  class Packet
    def call
      LABELING.mkpath
      requests = RequestFormEval.requests
      LABELING.join("packet.html").write(ERB.new(TEMPLATE, trim_mode: "-").result(binding))
      CSV.open(LABELING.join("answer-sheet.csv"), "w") do |csv|
        csv << %w[request question_number question_id question choices answer note]
        requests.each do |number, kase|
          visible(kase).each do |item|
            csv << [ number, item.prefix, item.link_id, item.text, choices(item), nil, nil ]
          end
        end
      end
      puts "Wrote #{LABELING.relative_path_from(Rails.root)}/packet.html and answer-sheet.csv (#{requests.size} requests)"
    end

    private

    def visible(kase) = RequestFormEval.question_set(kase).items.reject(&:hidden)

    def choices(item)
      item.type == "integer" ? "a number" : item.options.map { |o| "#{o[:code]} = #{o[:display]}" }.join(" | ")
    end

    def condition(kase, item)
      return if item.enable_when.empty?

      by_id = RequestFormEval.question_set(kase).items.index_by(&:link_id)
      item.enable_when.map do |w|
        CONDITION_WORDS.dig(w[:question], w[:code]) ||
          begin
            parent = by_id[w[:question]]
            option = parent.options.find { |o| o[:code] == w[:code] }
            "the answer to #{parent.prefix || "\"#{parent.text.truncate(60)}\""} is \"#{option[:display]}\""
          end
      end.join(", and ")
    end

    def chart(kase)
      resources = RequestFormEval.resources_for(kase)
      patient_id = kase["patient"]
      mine = lambda do |type|
        resources.select do |r|
          r["resourceType"] == type && [ r.dig("subject", "reference"), r.dig("beneficiary", "reference") ].include?("Patient/#{patient_id}")
        end
      end
      {
        patient: resources.find { |r| r["resourceType"] == "Patient" && r["id"] == patient_id },
        coverages: mine.call("Coverage"),
        prescriptions: mine.call("MedicationRequest").sort_by { |r| r["authoredOn"].to_s }.reverse,
        conditions: mine.call("Condition"),
        bmis: mine.call("Observation").select { |o| o.dig("code", "coding").to_a.any? { |c| c["code"] == "39156-5" } }.sort_by { |o| o["effectiveDateTime"].to_s },
        prescriber: resources.find { |r| r["resourceType"] == "Practitioner" },
        notes: RequestFormEval.seeded_notes[patient_id] || []
      }
    end

    def h(text) = ERB::Util.html_escape(text)

    def codes(concept) = concept.to_h.fetch("coding", []).map { |c| c["code"] }.compact.join(", ")

    TEMPLATE = <<~'HTML'.freeze
      <!doctype html>
      <html lang="en"><head><meta charset="utf-8"><title>Nora labelling packet</title>
      <style>
        body { font: 15px/1.5 system-ui, sans-serif; color: #171717; max-width: 860px; margin: 32px auto; padding: 0 16px; }
        h1 { font-size: 28px; } h2 { margin-top: 48px; border-top: 2px solid #171717; padding-top: 16px; page-break-before: always; }
        h3 { font-size: 16px; margin: 20px 0 6px; } table { border-collapse: collapse; width: 100%; font-size: 14px; }
        td, th { border: 1px solid #ccc; padding: 4px 8px; text-align: left; vertical-align: top; }
        pre { white-space: pre-wrap; font: inherit; background: #f6f4ef; padding: 12px; border-radius: 8px; }
        .q { margin: 10px 0; padding: 10px 12px; border: 1px solid #ccc; border-radius: 8px; }
        .when { color: #8a5a00; font-size: 13px; } .muted { color: #666; font-size: 13px; }
      </style></head><body>
      <h1>Labelling packet: <%= requests.size %> prior authorization requests</h1>
      <p>Every patient, plan and note here is invented. For each request, read the chart and answer the plan's questions the way you would at work, in <code>answer-sheet.csv</code>:</p>
      <ul>
        <li>an answer: the choice's code (for example <code>yes</code> or <code>27-29.9</code>), several codes separated by <code>;</code>, or a number;</li>
        <li><code>ASK</code>: the chart does not answer it and you would ask the prescriber's office;</li>
        <li><code>N/A</code>: the question does not apply to this patient (see "Only if").</li>
      </ul>
      <p>If a question applies only depending on one you answered ASK, answer it anyway if you can. Use the note column for anything you want to say. Work alone, and do not look anything up in Nora.</p>
      <% requests.each do |number, kase| c = chart(kase); p = c[:patient] -%>
      <h2><%= number %>: <%= h kase["item"] %>, <%= h kase["payer"] %></h2>
      <p class="muted">The request is dated <%= kase.fetch("as_of", "2026-10-23") %>.</p>
      <h3>Patient</h3>
      <p><%= h Array(p.dig("name", 0, "given")).join(" ") %> <%= h p.dig("name", 0, "family") %> · born <%= h p["birthDate"] %> · <%= h p["gender"] %></p>
      <h3>Coverages</h3>
      <table><tr><th>Status</th><th>Payer</th><th>Plan</th><th>Member ID</th><th>Other IDs on the record</th></tr>
      <% c[:coverages].each do |cov| -%>
      <tr><td><%= h cov["status"] %></td><td><%= h cov.dig("payor", 0, "display") %></td>
        <td><%= h cov["class"].to_a.find { |k| codes(k["type"]) == "plan" }&.then { |k| k["name"] || k["value"] } %></td>
        <td><%= h(cov.dig("identifier", 0, "value") || cov["subscriberId"]) %></td>
        <td><%= h cov["class"].to_a.reject { |k| codes(k["type"]) == "plan" }.map { |k| "#{codes(k["type"])} #{k["value"]}" }.join(", ") %></td></tr>
      <% end -%>
      </table>
      <h3>Prescriptions</h3>
      <table><tr><th>Written</th><th>Status</th><th>Drug</th><th>Quantity</th><th>Directions</th></tr>
      <% c[:prescriptions].each do |rx| -%>
      <tr><td><%= h rx["authoredOn"].to_s[0, 10] %></td><td><%= h rx["status"] %></td>
        <td><%= h(rx.dig("medicationCodeableConcept", "text") || "(see the medication record)") %></td>
        <td><%= h [rx.dig("dispenseRequest", "quantity", "value"), rx.dig("dispenseRequest", "quantity", "unit")].compact.join(" ") %><%= rx.dig("dispenseRequest", "expectedSupplyDuration", "value")&.then { |d| " per #{d} days" } %></td>
        <td><%= h rx.dig("dosageInstruction", 0, "text") %></td></tr>
      <% end -%>
      </table>
      <h3>Diagnoses</h3>
      <table><tr><th>Where</th><th>Status</th><th>Code</th><th>Description</th></tr>
      <% c[:conditions].each do |cond| -%>
      <tr><td><%= codes(cond["category"]&.first) == "problem-list-item" ? "Problem list" : "Visit diagnosis" %></td>
        <td><%= h cond.dig("clinicalStatus", "coding", 0, "code") %></td><td><%= h codes(cond["code"]) %></td><td><%= h cond.dig("code", "text") %></td></tr>
      <% end -%>
      </table>
      <h3>Vitals: BMI</h3>
      <p><%= c[:bmis].map { |o| "#{o["effectiveDateTime"].to_s[0, 10]}: #{o.dig("valueQuantity", "value")}" }.join(" · ").presence || "None recorded." %></p>
      <h3>Visit notes</h3>
      <% if c[:notes].empty? -%><p class="muted">No visit notes in this chart.</p><% end -%>
      <% c[:notes].each do |note| -%>
      <p><strong><%= h note[:title] %></strong>, <%= note[:occurred_on] %></p><pre><%= h note[:body] %></pre>
      <% end -%>
      <h3>The plan's questions</h3>
      <% visible(kase).each do |item| -%>
      <div class="q"><strong><%= h item.prefix %></strong> <%= h item.text %> <span class="muted">(<%= item.link_id %>)</span>
        <% if (w = condition(kase, item)) %><div class="when">Only if <%= h w %>.</div><% end %>
        <div class="muted">Choices: <%= h choices(item) %></div></div>
      <% end -%>
      <% end -%>
      </body></html>
    HTML
  end

  class Agreement
    def self.kappa(a, b)
      n = a.size.to_f
      return nil if n.zero?

      observed = a.zip(b).count { |x, y| x == y } / n
      expected = (a + b).uniq.sum { |c| (a.count(c) / n) * (b.count(c) / n) }
      expected == 1 ? 1.0 : ((observed - expected) / (1 - expected)).round(3)
    end

    # "Did they answer, say don't know, or skip it": the scale the eval's
    # correct-don't-know score is about.
    def self.coarse(value) = %w[ask n/a].include?(value) ? value : "answered"

    def initialize(dir: LABELING.join("labels"), out: $stdout)
      @dir = dir
      @out = out
    end

    def call
      sheets = @dir.glob("*.csv").sort.to_h { |path| [ path.basename(".csv").to_s, read(path) ] }
      raise "No filled answer sheets in #{@dir}" if sheets.empty?

      reference = reference_answers
      keys = reference.keys
      rows = sheets.map do |name, answers|
        missing = keys - answers.keys
        raise "#{name}: no answer for #{missing.first(3).join(', ')}#{' ...' if missing.size > 3}" if missing.any?

        mine = keys.map { |k| reference[k] }
        theirs = keys.map { |k| answers[k] }
        { labeller: name, items: keys.size, agreement: (mine.zip(theirs).count { |a, b| a == b } / keys.size.to_f).round(3),
          kappa: self.class.kappa(mine, theirs), kappa_coarse: self.class.kappa(mine.map { |v| self.class.coarse(v) }, theirs.map { |v| self.class.coarse(v) }) }
      end
      pairs = sheets.keys.combination(2).map do |a, b|
        x = keys.map { |k| sheets[a][k] }
        y = keys.map { |k| sheets[b][k] }
        { pair: "#{a} vs #{b}", kappa: self.class.kappa(x, y), kappa_coarse: self.class.kappa(x.map { |v| self.class.coarse(v) }, y.map { |v| self.class.coarse(v) }) }
      end
      write_report(rows, pairs, sheets, reference)
      { labellers: rows, between: pairs }
    end

    private

    def reference_answers
      RequestFormEval.requests.flat_map do |number, kase|
        RequestFormEval.question_set(kase).items.reject(&:hidden).map { |item| [ [ number, item.link_id ], RequestFormEval.reference_answer(kase, item.link_id) ] }
      end.to_h
    end

    def read(path)
      requests = RequestFormEval.requests
      CSV.read(path, headers: true).each_with_object({}) do |row, answers|
        kase = requests.fetch(row["request"]) { raise "#{path.basename}: unknown request #{row['request']}" }
        item = RequestFormEval.question_set(kase).items.find { |i| i.link_id == row["question_id"] } or raise "#{path.basename}: unknown question #{row['question_id']}"
        answers[[ row["request"], row["question_id"] ]] = normalise(row["answer"], item)
      end
    end

    def normalise(raw, item)
      text = raw.to_s.strip.downcase
      return "n/a" if text.empty? || %w[n/a na none-applies skip].include?(text)
      return "ask" if %w[ask check ask the office].include?(text)
      return text.to_i.to_s if item.type == "integer" && text.match?(/\A\d+\z/)

      text.split(/\s*;\s*/).map do |part|
        item.options.find { |o| o[:code] == part || o[:display].downcase == part }&.dig(:code) || part
      end.sort.join(";")
    end

    def write_report(rows, pairs, sheets, reference)
      requests = RequestFormEval.requests
      lines = [ "# Labelling agreement", "", "Written by `bin/rails eval:request_form:agreement` from `labeling/labels/*.csv`.", "",
                "| Labeller | Questions | Same answer as the eval | Cohen's kappa | Kappa: answered / ask / n/a |", "|---|---|---|---|---|" ]
      rows.each { |r| lines << "| #{r[:labeller]} | #{r[:items]} | #{(r[:agreement] * 100).round}% | #{r[:kappa]} | #{r[:kappa_coarse]} |" }
      pairs.each { |p| lines << "| #{p[:pair]} | | | #{p[:kappa]} | #{p[:kappa_coarse]} |" }
      lines += [ "", "## Disagreements", "", "Resolve each: fix the label in `cases.yml`, change Nora, or explain why both stand.", "",
                 "| Request | Case | Question | Eval | #{sheets.keys.join(' | ')} | Resolution |", "|---|---|---|---|#{'---|' * sheets.size}---|" ]
      reference.each do |(number, link), mine|
        theirs = sheets.values.map { |s| s[[ number, link ]] }
        next if theirs.all?(mine)

        lines << "| #{number} | #{requests[number]['id']} | #{link} | #{mine} | #{theirs.join(' | ')} | |"
      end
      @dir.parent.join("AGREEMENT.md").write(lines.join("\n") + "\n")
      @out.puts lines.first(4 + rows.size + pairs.size + 2).join("\n")
      @out.puts "Disagreements: #{lines.size - lines.index('## Disagreements') - 6} (see labeling/AGREEMENT.md)"
    end
  end
end
