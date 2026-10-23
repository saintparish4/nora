# Scores the timed-task sessions (docs/TIMED-TASK-PROTOCOL.md). See timed/README.md.
#
# timed/sessions.csv has one row per participant and request: the condition,
# the two times, whether it was finished, and the confidence score.
# timed/entries/<participant>-<request>.csv holds what they entered, scored
# against the eval's labels with the eval's rules. The report gives each
# person's time and error difference between the conditions, never only an
# average.
require "csv"
require Rails.root.join("evals/request_form/labeling")

module RequestFormEval
  TIMED = ROOT.join("timed")

  class TimedTask
    CONDITIONS = %w[chart_only with_nora].freeze
    # The protocol's four requests and the practice one, and its Latin square.
    PROTOCOL = { "tom" => "R01", "marcus" => "R09", "jane" => "R11", "elena" => "R13" }.freeze
    PRACTICE = "R16".freeze
    SQUARE = {
      "A" => [ %w[tom chart_only], %w[marcus with_nora], %w[jane chart_only], %w[elena with_nora] ],
      "B" => [ %w[marcus with_nora], %w[tom chart_only], %w[elena with_nora], %w[jane chart_only] ],
      "C" => [ %w[jane with_nora], %w[elena chart_only], %w[tom with_nora], %w[marcus chart_only] ],
      "D" => [ %w[elena chart_only], %w[jane with_nora], %w[marcus chart_only], %w[tom with_nora] ]
    }.freeze

    # sessions.template.csv in the protocol's order, and one blank entry sheet
    # per request: what the CoverMyMeds stand-in collects.
    def self.write_templates(dir: TIMED)
      dir.join("entries").mkpath
      CSV.open(dir.join("sessions.template.csv"), "w") do |csv|
        csv << %w[participant position request condition admin_seconds question_seconds finished confidence hesitated_on]
        SQUARE.each do |participant, order|
          order.each_with_index { |(name, condition), i| csv << [ participant, i + 1, PROTOCOL.fetch(name), condition, nil, nil, nil, nil, nil ] }
        end
      end
      labels = { "prescriber_phone" => "Prescriber office phone", "prescriber_address" => "Prescriber office address", "name" => "Prescriber",
                 "fax" => "Prescriber office fax", "npi" => "NPI", "rx_bin" => "Rx BIN", "rx_pcn" => "Rx PCN", "rx_group" => "Rx group",
                 "rx_member_id" => "Rx member ID", "member_id" => "Member ID", "rxnorm" => "RxNorm code", "zip" => "ZIP",
                 "days_supply" => "Days' supply", "primary" => "Diagnosis (ICD-10)", "bmi_code" => "BMI code (ICD-10)", "other" => "Other diagnoses" }
      (PROTOCOL.values + [ PRACTICE ]).each do |number|
        kase = RequestFormEval.requests.fetch(number)
        CSV.open(dir.join("entries", "template-#{number}.csv"), "w") do |csv|
          csv << %w[kind key label value]
          RequestFormEval.spec.fetch("patients").fetch(kase["patient"]).each_key { |key| csv << [ "field", key, labels[key] || key.humanize, nil ] }
          RequestFormEval.question_set(kase).items.reject(&:hidden).each { |item| csv << [ "question", item.link_id, [ item.prefix, item.text ].compact.join(" "), nil ] }
        end
      end
    end

    def initialize(dir: TIMED, out: $stdout)
      @dir = dir
      @out = out
      spec = RequestFormEval.spec
      @patients = spec.fetch("patients")
      @requests = RequestFormEval.requests
    end

    def call
      sessions = CSV.read(@dir.join("sessions.csv"), headers: true).map(&:to_h)
      raise "No sessions in #{@dir.join('sessions.csv')}" if sessions.empty?

      scored = sessions.map { |s| s.merge(score(s)) }
      people = scored.group_by { |s| s["participant"] }.map { |name, rows| person(name, rows) }
      report(scored, people)
      { sessions: scored, people: people }
    end

    private

    def score(session)
      kase = @requests.fetch(session["request"]) { raise "unknown request #{session['request']}" }
      raise "#{session['participant']} #{session['request']}: condition must be one of #{CONDITIONS.join(', ')}" unless CONDITIONS.include?(session["condition"])

      path = @dir.join("entries", "#{session['participant']}-#{session['request']}.csv")
      entries = path.exist? ? CSV.read(path, headers: true).to_h { |r| [ [ r["kind"], r["key"] ], r["value"] ] } : {}
      fields = @patients.fetch(kase["patient"]).merge(kase.fetch("fields", {}))
      field_errors = fields.count { |key, expected| norm(entries[[ "field", key ]]) != norm(expected) }
      outcomes = Hash.new(0)
      RequestFormEval.question_set(kase).items.reject(&:hidden).each do |item|
        expected = RequestFormEval.reference_answer(kase, item.link_id)
        got = answer(entries[[ "question", item.link_id ]], item)
        outcomes[question_outcome(expected, got)] += 1
      end
      seconds = session["admin_seconds"].to_f + session["question_seconds"].to_f
      { "seconds" => seconds, "field_errors" => field_errors, "outcomes" => outcomes,
        "errors" => field_errors + outcomes[:wrong] + outcomes[:guessed] + outcomes[:missed_question] }
    end

    # The costly one is a guess where the right move was to ask.
    def question_outcome(expected, got)
      if expected == got then :correct
      elsif expected == "ask" then got == "n/a" ? :missed_question : :guessed
      elsif got == "ask" then :safe_miss
      elsif got == "n/a" || expected == "n/a" then :missed_question
      else :wrong
      end
    end

    def answer(raw, item)
      text = raw.to_s.strip.downcase
      return "n/a" if text.empty? || text == "n/a"
      return "ask" if %w[ask check].include?(text)

      text.split(/\s*;\s*/).map { |p| item.options.find { |o| o[:code] == p || o[:display].downcase == p }&.dig(:code) || p }.sort.join(";")
    end

    def norm(value) = value.to_s.strip.squeeze(" ").downcase.presence

    def median(values) = values.empty? ? nil : values.sort[(values.size - 1) / 2, 2].then { |m| (m.sum / m.size.to_f).round(1) }

    def person(name, rows)
      by = rows.group_by { |r| r["condition"] }
      time = CONDITIONS.to_h { |c| [ c, median(Array(by[c]).map { |r| r["seconds"] }) ] }
      errors = CONDITIONS.to_h { |c| [ c, Array(by[c]).sum { |r| r["errors"] } ] }
      guesses = CONDITIONS.to_h { |c| [ c, Array(by[c]).sum { |r| r["outcomes"][:guessed] } ] }
      { participant: name, median_seconds: time, seconds_saved: time.values.all? ? (time["chart_only"] - time["with_nora"]).round(1) : nil,
        errors: errors, error_difference: errors["with_nora"] - errors["chart_only"], guesses: guesses,
        unfinished: rows.count { |r| r["finished"].to_s.downcase.start_with?("n") } }
    end

    def report(scored, people)
      lines = [ "# Timed task results", "", "Written by `bin/rails eval:request_form:timed` from `timed/`. Times are medians of each person's two requests per condition.", "",
                "| Participant | Chart only (s) | With Nora (s) | Seconds saved | Errors, chart only | Errors, with Nora | Error difference | Guesses where the office should be asked | Unfinished |",
                "|---|---|---|---|---|---|---|---|---|" ]
      people.each do |p|
        lines << "| #{p[:participant]} | #{p[:median_seconds]['chart_only']} | #{p[:median_seconds]['with_nora']} | #{p[:seconds_saved]} | " \
                 "#{p[:errors]['chart_only']} | #{p[:errors]['with_nora']} | #{p[:error_difference]} | " \
                 "#{p[:guesses]['chart_only']} without, #{p[:guesses]['with_nora']} with | #{p[:unfinished]} |"
      end
      lines += [ "", "## Every request", "", "| Participant | Request | Condition | Seconds | Field errors | Wrong answers | Guesses | Missed or extra questions | Safe misses | Confidence |",
                 "|---|---|---|---|---|---|---|---|---|---|" ]
      scored.each do |s|
        o = s["outcomes"]
        lines << "| #{s['participant']} | #{s['request']} | #{s['condition']} | #{s['seconds']} | #{s['field_errors']} | #{o[:wrong]} | #{o[:guessed]} | " \
                 "#{o[:missed_question]} | #{o[:safe_miss]} | #{s['confidence']} |"
      end
      @dir.join("RESULTS.md").write(lines.join("\n") + "\n")
      @out.puts lines.first(6 + people.size).join("\n")
    end
  end
end
