module Ncpdp
  # Walks a FHIR Questionnaire the way a person filling it in would: which
  # question comes next after each answer, following enableWhen. Used to
  # derive NCPDP's forward next-question graph from a Questionnaire, and to
  # check that a Questionnaire mapped back from NCPDP asks the same questions.
  #
  # A question without choices has one answer, "*". A multi-select is walked
  # one choice at a time: NCPDP requires a multi-select's branches to
  # converge, so one is enough.
  class Paths
    ANY = "*".freeze

    # @param fixed [Hash{String => String}] answers already known, e.g. the
    #   member's age group, as a payer would know them
    def initialize(questionnaire, fixed: {})
      @items = flatten(questionnaire.fetch("item"))
      @fixed = fixed
      # The answers that can still matter from each position on.
      @relevant = @items.each_index.map { |i| @items[i..].flat_map { |item| Array(item["enableWhen"]).map { |w| w["question"] } }.uniq }
    end

    # Every reachable step: [question, answer, next question or nil], each
    # once, without enumerating every path (states are memoized on the
    # answers later questions still depend on).
    def transitions
      found = Set.new
      seen = Set.new
      stack = [ [ 0, {}, nil ] ]
      until stack.empty?
        index, answers, from = stack.pop
        position, answers = skip_fixed(next_position(index, answers), answers)
        found << [ *from, position && @items[position]["linkId"] ] if from
        next if position.nil?

        state = [ position, answers.slice(*@relevant[position]) ]
        next unless seen.add?(state)

        choices(@items[position]).each do |choice|
          link = @items[position]["linkId"]
          stack << [ position + 1, answers.merge(link => choice), [ link, choice ] ]
        end
      end
      found.to_a
    end

    # One path, choosing each answer with the block: [[question, answer], ...].
    # Facts already applied are not part of it.
    def walk
      answers = {}
      path = []
      index = 0
      loop do
        position, answers = skip_fixed(next_position(index, answers), answers)
        break if position.nil?

        item = @items[position]
        choice = yield(item, choices(item))
        answers[item["linkId"]] = choice
        path << [ item["linkId"], choice ]
        index = position + 1
      end
      path
    end

    private

    def flatten(items) = items.flat_map { |i| [ i, *flatten(Array(i["item"])) ] }

    def choices(item)
      return [ @fixed[item["linkId"]] ] if @fixed.key?(item["linkId"])

      Array(item["answerOption"]).map { |o| o.dig("valueCoding", "code") }.presence || [ ANY ]
    end

    # Facts already applied are answered without being asked.
    def skip_fixed(position, answers)
      while position && @fixed.key?(@items[position]["linkId"])
        answers = answers.merge(@items[position]["linkId"] => @fixed[@items[position]["linkId"]])
        position = next_position(position + 1, answers)
      end
      [ position, answers ]
    end

    def next_position(index, answers) = (index...@items.size).find { |i| enabled?(@items[i], answers) }

    def enabled?(item, answers)
      conditions = Array(item["enableWhen"])
      return true if conditions.empty?

      results = conditions.map do |w|
        given = answers[w["question"]]
        case w["operator"]
        when "exists" then given.nil? != w["answerBoolean"]
        when "=" then given == w.dig("answerCoding", "code")
        when "!=" then !given.nil? && given != w.dig("answerCoding", "code")
        else raise "enableWhen operator #{w['operator']} is not supported"
        end
      end
      item["enableBehavior"] == "any" ? results.any? : results.all?
    end
  end
end
