module Authorizations
  # The deterministic half of evidence extraction: finds sentences in the chart
  # that a criterion's hint points at.
  #
  # A keyword alone is not evidence. "No hypertension", "mother has type 2
  # diabetes", and "we discussed phentermine; she declined" all contain the
  # keyword and document nothing, so each kind of criterion has a short list of
  # contexts in which a mention is dropped. The lists are deliberately small and
  # err toward proposing: a person verifies every excerpt, and a missed sentence
  # costs them a search.
  #
  # Measured by the evidence eval (evals/evidence). Change a list, run the eval.
  class RulePass
    MAX_HITS_PER_CRITERION = 5
    BMI_PATTERN = /\b(?:BMI|body mass index)\b[^0-9\n]{0,24}(\d{2}(?:\.\d{1,2})?)/i

    Hit = Struct.new(:document, :start, :finish, :confidence, :rationale)

    # A denial earlier in the same clause: "no", "denies", "without".
    NEGATED_BEFORE = /\b(?:no|not|denies|denied|without|negative for|never|free of)\b[^.;:]*\z/i
    # The finding belongs to a relative.
    FAMILY = /\b(?:family history|mother|father|sister|brother|parents?|grandmother|grandfather|aunt|uncle|siblings?|husband|wife)\b/i
    # The condition was considered and dismissed.
    DISMISSED = /\b(?:ruled out|rules out|was suspected|diagnosis was removed|resolved)\b/i
    # A drug that was talked about, not taken.
    NOT_TAKEN = /\b(?:declined|never picked up|does not want|did not want|discussed|reviewed|considered|advertisement|asked about|asks whether|has never (?:taken|used))\b/i
    # A program that was recommended, not followed.
    NOT_DONE = /\b(?:advised|recommend(?:ed|s)?|referred|counsel(?:ed|led)|unable to|has not started|no (?:diet|exercise|structured)|not yet|after (?:she|he|they) (?:has|have) started)\b/i

    # What a documented trial has to say beyond the drug's name.
    OUTCOME = %r{\b(?:stopped|discontinued|d/c'?d|lost|weight loss|no weight change|not losing|lack of effect|ineffective|inadequate|side effects?|intoleran\w+)\b}i
    # A statement that something is not, or will not be, the case.
    DENIAL = /\b(?:no|not|never|none|denies|denied|without)\b/i
    MONTH_NAMES = Date::MONTHNAMES.compact.map(&:downcase).freeze
    NUMBER_WORDS = %w[zero one two three four five six seven eight nine ten eleven twelve].freeze

    # @param request_date [Date] the day the request was opened; "the last six
    #   months" counts back from it
    def initialize(documents:, request_date:)
      @documents = documents
      @request_date = request_date
    end

    # @return [Array<Hit>] at most MAX_HITS_PER_CRITERION, in chart order
    def hits_for(criterion)
      hits = bmi_hits(criterion) + term_hits(criterion)
      hits.uniq { |hit| [ hit.document.id, hit.start, hit.finish ] }.first(MAX_HITS_PER_CRITERION)
    end

    private

    # A BMI at or above the threshold, from a document recent enough to count.
    # A lower threshold applies only when the chart also documents one of the
    # listed comorbidities.
    def bmi_hits(criterion)
      min = criterion.bmi_min or return []

      lower = criterion.hint["bmi_min_with_comorbidity"]
      lower = nil unless lower && mentions(criterion.hint["comorbidity_terms"], kind: "diagnosis").any?
      recent = recent_documents(criterion.hint["within_months"])

      each_match(BMI_PATTERN, recent).filter_map do |document, match|
        value = match[1].to_f
        threshold = value >= min ? min : lower
        next unless threshold && value >= threshold

        hit(document, match.begin(0), 0.9, "Documented BMI #{match[1]} meets the #{threshold} threshold.")
      end
    end

    def term_hits(criterion)
      found = mentions(criterion.terms, kind: criterion.kind)
      found = found.select { |mention| mention[:sentence].match?(OUTCOME) } if criterion.hint["requires_outcome"]
      found = found.select { |mention| mention[:sentence].match?(DENIAL) } if criterion.hint["requires_denial"]
      found = long_enough(found, criterion.hint["min_months"]) if criterion.hint["min_months"]
      return [] if criterion.hint["also_requires"] && mentions(criterion.hint["also_requires"], kind: criterion.kind).empty?
      return [] if distinct_drugs(criterion, found) < criterion.hint.fetch("min_distinct", 1)

      found.map { |m| Hit.new(m[:document], m[:start], m[:finish], 0.6, "Mentions \"#{m[:term]}\".") }
    end

    # Sentences that name any of the terms in a context that counts for this
    # kind of criterion.
    def mentions(terms, kind:)
      Array(terms).flat_map do |term|
        each_match(/(?<![\w.])#{Regexp.escape(term)}(?![\w])/i).filter_map do |document, match|
          start, finish = sentence_range(document.body, match.begin(0))
          sentence = document.body[start...finish]
          next if out_of_context?(kind, sentence, match.begin(0) - start)

          { document: document, start: start, finish: finish, sentence: sentence, term: term }
        end
      end
    end

    def recent_documents(months)
      return @documents unless months

      cutoff = @request_date << months
      @documents.select { |document| document.occurred_on.nil? || document.occurred_on >= cutoff }
    end

    # Drops a mention whose sentence dates the program to less than `months`
    # before the request. A sentence with no readable date is kept: a person
    # will check it.
    def long_enough(found, months)
      cutoff = @request_date << months
      found.reject do |mention|
        began = started_on(mention[:sentence], mention[:document].occurred_on || @request_date)
        began && began > cutoff
      end
    end

    # When the sentence says something began: "since January 2026", "since
    # 12/2025", "for the past ten months", "eight months ago", "last November".
    def started_on(sentence, written_on)
      text = sentence.downcase
      if (match = text.match(/\b(#{MONTH_NAMES.join('|')})\s+(\d{4})\b/))
        Date.new(match[2].to_i, MONTH_NAMES.index(match[1]) + 1, 1)
      elsif (match = text.match(%r{\bsince\s+(\d{1,2})/(\d{4})\b}))
        Date.new(match[2].to_i, match[1].to_i.clamp(1, 12), 1)
      elsif (match = text.match(/\bsince\s+(\d{4})\b/))
        Date.new(match[1].to_i, 1, 1)
      elsif (match = text.match(/\b(\d+|#{NUMBER_WORDS.join('|')})[ -]months?\b/))
        written_on << (NUMBER_WORDS.index(match[1]) || match[1].to_i)
      elsif (match = text.match(/\blast\s+(#{MONTH_NAMES.join('|')})\b/))
        month = MONTH_NAMES.index(match[1]) + 1
        Date.new(month < written_on.month ? written_on.year : written_on.year - 1, month, 1)
      end
    end

    # How many different drugs the mentions cover. Brand and generic names of
    # one drug are listed together in the hint and count once.
    def distinct_drugs(criterion, found)
      groups = Array(criterion.hint["drugs"])
      return found.empty? ? 0 : 1 if groups.empty?

      found.map { |m| groups.index { |names| names.any? { |name| name.casecmp?(m[:term]) } } }.uniq.size
    end

    # True when the sentence names the term without documenting it for this
    # patient: denied, a relative's, dismissed, or only talked about.
    def out_of_context?(kind, sentence, term_offset)
      before = sentence[0...term_offset]
      case kind
      when "diagnosis"
        before.match?(NEGATED_BEFORE) || before.match?(FAMILY) || sentence.match?(DISMISSED)
      when "prior_trial"
        sentence.match?(NOT_TAKEN) || before.match?(FAMILY)
      when "lifestyle"
        sentence.match?(NOT_DONE)
      else
        false
      end
    end

    def each_match(pattern, documents = @documents)
      return to_enum(:each_match, pattern, documents) unless block_given?

      documents.each do |document|
        document.body.to_enum(:scan, pattern).each { yield document, Regexp.last_match }
      end
    end

    def hit(document, index, confidence, rationale)
      Hit.new(document, *sentence_range(document.body, index), confidence, rationale)
    end

    # The sentence around `index`: back to the previous sentence end or line
    # break, forward to the next one. Offsets are into the original body.
    def sentence_range(body, index)
      start = body.rindex(/[.!?]\s|\n/, index)
      start = start ? start + 1 : 0
      start += 1 while start < body.length && body[start].match?(/\s/)

      finish = body.index(/[.!?](\s|\z)|\n/, index)
      finish = finish ? finish + (body[finish] == "\n" ? 0 : 1) : body.length
      finish -= 1 while finish > start && body[finish - 1].match?(/\s/)
      [ start, finish ]
    end
  end
end
