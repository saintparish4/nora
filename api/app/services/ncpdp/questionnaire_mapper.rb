module Ncpdp
  # Maps an NCPDP SCRIPT ePA QuestionSet (from PAInitiationResponse, versions
  # 2017071 and 2023011) to a FHIR R4 Questionnaire, the way a client that
  # receives the payer's questions would render them. Works on ONC's test
  # messages as well as on the sets Nora writes.
  #
  # NCPDP's forward graph becomes enableWhen: a question is enabled when any
  # question pointing to it was answered the way that points to it.
  #
  # Mapped:     QuestionSetID, title, description; each Question's ID, text,
  #             sequence, CodedReference, type (Select / SelectMultiple /
  #             FreeText / Numeric / Date); each Choice's ID, text, order;
  #             AdditionalFreeTextIndicator M or O as a nested text question.
  # Not mapped: PACaseID and DeadlineForReply (they describe the case, not
  #             the form: a Task's, not a Questionnaire's), the contact
  #             number, AttachmentRequired (kept as an extension),
  #             NextQuestionCondition and RangeComparison (reported), and
  #             any question nothing leads to (never asked; reported).
  class QuestionnaireMapper
    Result = Data.define(:questionnaire, :unmapped)

    EXT = "https://nora.example/fhir/StructureDefinition".freeze
    END_ID = "END".freeze

    def self.call(...) = new(...).call

    # @param xml [String] a whole SCRIPT message, or just the Open or QuestionSet element
    def initialize(xml)
      @doc = Nokogiri::XML(xml).remove_namespaces!
    end

    def call
      set = @doc.at_xpath("//QuestionSet") or raise ArgumentError, "No QuestionSet in the message"
      @unmapped = []
      @unmapped << "PACaseID #{text(@doc, '//Open/PACaseID')}" if text(@doc, "//Open/PACaseID")
      @unmapped << "DeadlineForReply #{text(@doc, '//Open/DeadlineForReply/DateTime')}" if text(@doc, "//Open/DeadlineForReply/DateTime")
      @unmapped << "QuestionSetContactCommunicationNumber" if set.at_xpath("Header/QuestionSetContactCommunicationNumber")
      questions = set.xpath("Question").sort_by { |q| text(q, "SequenceNumber").to_i }
      incoming = incoming_edges(questions)
      @reachable = reachable(questions, incoming)
      set_id = text(set, "Header/QuestionSetID")
      attachment = text(set, "Header/AttachmentRequired") || text(set, "Header/AttachementRequired")
      questionnaire = {
        "resourceType" => "Questionnaire", "id" => "ncpdp-#{set_id.parameterize}",
        "identifier" => [ { "system" => "urn:ncpdp:script:question-set-id", "value" => set_id } ],
        "title" => text(set, "Header/QuestionSetTitle"), "status" => "active", "subjectType" => [ "Patient" ],
        "description" => text(set, "Header/QuestionSetDescription"),
        "extension" => ([ { "url" => "#{EXT}/attachment-required", "valueBoolean" => attachment == "true" } ] if attachment),
        "item" => questions.each_with_index.filter_map { |q, n| item(q, set_id, incoming, first: n.zero?) }
      }.compact
      Result.new(questionnaire: questionnaire, unmapped: @unmapped)
    end

    private

    def text(node, path) = node.at_xpath(path)&.text&.strip.presence

    # { question ID => [[from question ID, choice ID or nil for "any answer"], ...] }
    def incoming_edges(questions)
      edges = Hash.new { |h, k| h[k] = [] }
      questions.each do |q|
        id = text(q, "QuestionID")
        default = text(q, "DefaultNextQuestionID")
        @unmapped << "#{id}: NextQuestionCondition" if q.at_xpath(".//NextQuestionCondition")
        choices = q.xpath("QuestionType/Select/Choice")
        if choices.any? && text(q, "QuestionType/Select/SelectMultiple") != "true"
          choices.each do |c|
            target = text(c, "NextQuestionID") || default
            edges[target] << [ id, text(c, "ChoiceID") ] if target && target != END_ID
          end
        elsif default && default != END_ID
          edges[default] << [ id, nil ]
        end
      end
      edges
    end

    # The questions some path from the first one leads to. NCPDP never asks
    # the others.
    def reachable(questions, incoming)
      ids = questions.map { |q| text(q, "QuestionID") }
      found = Set[ids.first]
      loop do
        more = ids.select { |id| !found.include?(id) && incoming[id].any? { |from, _| found.include?(from) } }
        break if more.empty?

        found.merge(more)
      end
      found
    end

    def item(q, set_id, incoming, first:)
      id = text(q, "QuestionID")
      type = q.at_xpath("QuestionType/*")&.name
      item = { "linkId" => id, "text" => text(q, "QuestionText"), "required" => true }
      if (coded = q.at_xpath("CodedReference"))
        # A CDA template OID names a section, not a concept; kept as a URI.
        qualifier = text(coded, "Qualifier")
        code = text(coded, "Code")
        item["code"] = [ { "system" => qualifier == "HL7OID" ? "urn:ietf:rfc:3986" : "urn:ncpdp:qualifier:#{qualifier}",
                           "code" => qualifier == "HL7OID" ? "urn:oid:#{code}" : code, "display" => text(coded, "Description") }.compact ]
      end
      case type
      when "Select"
        choices = q.xpath("QuestionType/Select/Choice").sort_by { |c| text(c, "SequenceNumber").to_i }
        item["type"] = "choice"
        item["repeats"] = true if text(q, "QuestionType/Select/SelectMultiple") == "true"
        item["answerOption"] = choices.map do |c|
          { "valueCoding" => { "system" => "urn:ncpdp:script:question-set:#{set_id}:#{id}", "code" => text(c, "ChoiceID"), "display" => text(c, "ChoiceText") } }
        end
        free_text = choices.select { |c| %w[M O].include?(text(c, "AdditionalFreeTextIndicator")) }
        item["item"] = free_text.map do |c|
          { "linkId" => "#{id}.#{text(c, 'ChoiceID')}.text", "text" => "Please specify", "type" => "text",
            "required" => text(c, "AdditionalFreeTextIndicator") == "M",
            "enableWhen" => [ { "question" => id, "operator" => "=", "answerCoding" => { "system" => "urn:ncpdp:script:question-set:#{set_id}:#{id}", "code" => text(c, "ChoiceID") } } ] }
        end.presence
      when "Numeric" then item["type"] = "decimal"
      when "Date" then item["type"] = text(q, "QuestionType/Date/IsDateTimeRequired") == "true" ? "dateTime" : "date"
      else item["type"] = "text"
      end
      unless first
        conditions = incoming[id].select { |from, _| @reachable.include?(from) }.map do |from, choice|
          if choice
            { "question" => from, "operator" => "=", "answerCoding" => { "system" => "urn:ncpdp:script:question-set:#{set_id}:#{from}", "code" => choice } }
          else
            { "question" => from, "operator" => "exists", "answerBoolean" => true }
          end
        end
        # NCPDP never asks a question nothing leads to. FHIR has no "never",
        # so it is left out.
        if conditions.empty?
          @unmapped << "#{id} (no question leads to it: never asked)"
          return
        end
        item["enableWhen"] = conditions
        item["enableBehavior"] = "any" if conditions.size > 1
      end
      item.compact
    end
  end
end
