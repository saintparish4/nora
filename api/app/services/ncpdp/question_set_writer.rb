module Ncpdp
  # Writes a question set as the NCPDP SCRIPT 2023011 QuestionSet a payer
  # sends in PAInitiationResponse (Response/ResponseStatus/Open), following
  # the element structure of ONC's eRx test messages (onc-samples/).
  #
  # NCPDP branches forward: each choice names the next question, or the
  # question's DefaultNextQuestionID does, and "END" ends the set. A FHIR
  # Questionnaire branches backward, with enableWhen. The writer walks every
  # path through the Questionnaire (Paths) and records, for each answer, the
  # question that comes next. Where the same answer leads to different
  # questions on different paths, one NextQuestionID cannot say so: that is a
  # conflict, reported, and the earliest of those questions is written.
  #
  # Static: the plan-level set, where the facts Nora reads silently (age
  # group, FEP option, dosage form) become ordinary questions. Fixed: the set
  # a payer would send for one member, those facts already applied.
  class QuestionSetWriter
    Result = Data.define(:xml, :conflicts, :question_ids)

    END_ID = "END".freeze
    HIDDEN = "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden".freeze

    def self.call(...) = new(...).call

    # @param questionnaire [Hash] a FHIR Questionnaire (JSON)
    # @param fixed [Hash{String => String}] hidden facts to apply, as a payer
    #   would for one member; those questions are left out
    def initialize(questionnaire, fixed: {}, case_id: "NORA-DEMO-0001", deadline: "2026-10-26T23:59:59")
      @q = questionnaire
      @fixed = fixed
      @case_id = case_id
      @deadline = deadline
    end

    def call
      transitions = Paths.new(@q, fixed: @fixed).transitions
      # A payer sends only what this member can be asked.
      reached = transitions.flat_map { |from, _, to| [ from, to ] }.compact.to_set
      items = @q.fetch("item").reject { |i| @fixed.key?(i["linkId"]) || !reached.include?(i["linkId"]) }
      ids = items.each_with_index.to_h { |item, n| [ item["linkId"], "Q#{n + 1}" ] }
      choice_ids = items.to_h do |item|
        [ item["linkId"], Array(item["answerOption"]).each_with_index.to_h { |o, n| [ o.dig("valueCoding", "code"), "#{ids[item['linkId']]}C#{n + 1}" ] } ]
      end
      edges, conflicts = edges(transitions, ids)
      xml = Nokogiri::XML::Builder.new(encoding: "UTF-8") do |x|
        x.Open do
          x.PACaseID @case_id
          x.DeadlineForReply { x.DateTime @deadline }
          x.QuestionSet do
            x.Header do
              x.QuestionSetID @q["id"]
              x.QuestionSetTitle @q["title"]
              x.QuestionSetDescription @q["description"].to_s.truncate(500)
              x.AttachmentRequired attachment_required?
            end
            items.each_with_index { |item, n| question(x, item, n + 1, ids, choice_ids, edges) }
          end
        end
      end.to_xml
      Result.new(xml: xml, conflicts: conflicts, question_ids: ids)
    end

    private

    # (linkId, answer) => next linkId or END, over every reachable state.
    def edges(transitions, ids)
      seen = Hash.new { |h, k| h[k] = [] }
      transitions.each do |link, answer, target|
        next if @fixed.key?(link)

        seen[[ link, answer ]] << (target || END_ID)
      end
      conflicts = seen.filter_map do |(link, answer), targets|
        next if targets.uniq.size == 1

        { question: link, answer: answer, next: targets.uniq }
      end
      [ seen.transform_values { |targets| targets.min_by { |t| t == END_ID ? Float::INFINITY : ids.fetch(t)[1..].to_i } }, conflicts ]
    end

    def question(x, item, sequence, ids, choice_ids, edges)
      link = item["linkId"]
      choices = Array(item["answerOption"])
      targets = choices.to_h { |o| [ o.dig("valueCoding", "code"), edges[[ link, o.dig("valueCoding", "code") ]] ] }
      reached = targets.values.compact
      # One next question for every choice: say it once, as the samples do.
      default = choices.empty? ? edges[[ link, Paths::ANY ]] : (reached.uniq.size == 1 && reached.size == choices.size ? reached.first : nil)
      default ||= END_ID if item["repeats"]
      x.Question do
        x.QuestionID ids[link]
        x.SequenceNumber sequence
        x.QuestionText question_text(item)
        x.DefaultNextQuestionID next_id(default, ids) if default
        x.QuestionType do
          case item["type"]
          when "choice"
            x.Select do
              x.SelectMultiple item["repeats"] == true
              choices.each_with_index do |o, n|
                code = o.dig("valueCoding", "code")
                x.Choice do
                  x.ChoiceID choice_ids.dig(link, code)
                  x.SequenceNumber n + 1
                  x.ChoiceText o.dig("valueCoding", "display")
                  x.AdditionalFreeTextIndicator(o.dig("valueCoding", "display").to_s.match?(/specify/i) ? "M" : "NA")
                  x.NextQuestionID next_id(targets[code], ids) if default.nil? && !item["repeats"] && targets[code]
                end
              end
            end
          when "integer", "decimal" then x.Numeric { x.IsNumeric true }
          when "date", "dateTime" then x.Date { x.IsDateTimeRequired item["type"] == "dateTime" }
          else x.FreeText { x.IsFreeText true }
          end
        end
      end
    end

    # A fact Nora reads silently has no wording on the form; ask it plainly.
    def question_text(item)
      hidden = Array(item["extension"]).any? { |e| e["url"] == HIDDEN }
      hidden ? "#{item['text']}?" : item["text"]
    end

    def next_id(link, ids) = link == END_ID ? END_ID : ids.fetch(link)

    def attachment_required?
      @q["id"] == "fep-zepbound" # "SUBMITTING THE PATIENT'S MEDICAL RECORDS IS REQUIRED."
    end
  end
end
