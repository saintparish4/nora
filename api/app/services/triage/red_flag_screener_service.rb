module Triage
  # Deterministic emergency screening that runs *before* the language model.
  #
  # The analyzer's OpenAI call is probabilistic: it can time out, return
  # unparseable JSON, or simply be wrong. For the handful of presentations where
  # being wrong is measured in minutes — heart attack, stroke, anaphylaxis,
  # uncontrolled bleeding, suicidal ideation — a model must not be the only
  # thing standing between a patient and an emergency room.
  #
  # So these rules are plain string matching, they run first, and when one fires
  # the analyzer skips the model entirely and returns "emergency".
  #
  # Two deliberate biases:
  #
  # 1. **The screener only escalates.** There is no rule here that lowers a care
  #    level. A false positive sends someone to an ER they did not need; a false
  #    negative is the failure this class exists to prevent. Those are not
  #    symmetric costs, and the rules are tuned accordingly.
  # 2. **Recall over precision.** Patterns are broad and match common phrasing
  #    rather than clinical vocabulary, because patients do not write like
  #    clinicians. The one concession is a short negation guard: "no chest pain"
  #    is common enough in symptom text that firing on it would teach patients
  #    to dismiss the warning.
  #
  # Note on what is deliberately *absent*: bare "shortness of breath" is not a
  # trigger. It accompanies asthma, anxiety, and deconditioning often enough
  # that it would fire on a large share of routine traffic and dilute the
  # signal. The acute phrasings ("can't breathe", "gasping") do trigger.
  class RedFlagScreenerService
    # Words that, immediately before a matched phrase, flip it to a denial.
    NEGATORS = %w[no not never without denies deny denying negative].freeze

    # How many words before the match to inspect for a negator. Three is enough
    # for "i have no chest pain" and short enough that "i am not sure if this is
    # chest pain" still fires — which is the direction we want to err.
    NEGATION_WINDOW = 3

    # Every rule resolves to the same disposition (emergency); they are kept
    # separate so the fired rule ids can be logged and the patient-facing label
    # can say which sign was recognized.
    RULES = [
      {
        id: "cardiac",
        label: "Possible heart attack symptoms",
        patterns: [
          "chest pain", "chest pains", "pain in my chest", "pain in the chest",
          "chest pressure", "pressure in my chest", "chest tightness",
          "tightness in my chest", "tight chest", "crushing chest",
          "heart attack", "pain radiating to my arm", "pain down my left arm",
          "pain in my jaw and chest", "elephant on my chest"
        ]
      },
      {
        id: "stroke",
        label: "Possible stroke symptoms",
        patterns: [
          "stroke", "face drooping", "drooping face", "face is drooping",
          "slurred speech", "slurring my words", "slurring my speech",
          "sudden weakness", "sudden numbness", "numbness on one side",
          "weakness on one side", "one side of my body", "one side of my face",
          "sudden confusion", "sudden vision loss", "sudden loss of vision",
          "worst headache of my life", "thunderclap headache",
          "cant move my arm", "can't move my arm", "cant speak", "can't speak"
        ]
      },
      {
        id: "airway",
        label: "Difficulty breathing",
        patterns: [
          "cant breathe", "can't breathe", "cannot breathe", "can not breathe",
          "trouble breathing", "difficulty breathing", "struggling to breathe",
          "hard to breathe", "gasping for air", "gasping for breath",
          "choking", "turning blue", "lips are blue"
        ]
      },
      {
        id: "anaphylaxis",
        label: "Possible severe allergic reaction",
        patterns: [
          "anaphylaxis", "anaphylactic", "throat closing", "throat is closing",
          "throat swelling", "throat is swelling", "tongue swelling",
          "tongue is swelling", "swollen tongue", "lips are swelling",
          "face is swelling", "severe allergic reaction", "used my epipen",
          "epipen"
        ]
      },
      {
        id: "hemorrhage",
        label: "Uncontrolled bleeding",
        patterns: [
          "bleeding wont stop", "bleeding won't stop", "wont stop bleeding",
          "won't stop bleeding", "uncontrolled bleeding", "heavy bleeding",
          "bleeding heavily", "hemorrhage", "hemorrhaging",
          "coughing up blood", "vomiting blood", "throwing up blood",
          "blood in my vomit", "lost a lot of blood"
        ]
      },
      {
        id: "self_harm",
        label: "Thoughts of self-harm",
        patterns: [
          "suicidal", "suicide", "kill myself", "killing myself",
          "end my life", "ending my life", "want to die", "wanna die",
          "hurt myself", "harm myself", "self harm", "harming myself",
          "no reason to live", "better off dead"
        ]
      },
      {
        id: "altered_consciousness",
        label: "Loss of consciousness or seizure",
        patterns: [
          "unconscious", "unresponsive", "passed out", "blacked out",
          "wont wake up", "won't wake up", "not waking up", "seizure",
          "seizing", "convulsing", "convulsions"
        ]
      },
      {
        id: "poisoning",
        label: "Possible overdose or poisoning",
        patterns: [
          "overdose", "overdosed", "took too many pills", "poisoned",
          "swallowed bleach", "drank bleach", "carbon monoxide"
        ]
      }
    ].freeze

    # @param text [String] raw symptom text or a conversation transcript
    # @return [Hash, nil] nil when nothing fired. Otherwise the disposition plus
    #   the labels and rule ids that produced it.
    def self.screen(text)
      new(text).screen
    end

    def initialize(text)
      @text = text
    end

    def screen
      return nil if normalized.blank?

      fired = RULES.select { |rule| rule[:patterns].any? { |pattern| affirmative_match?(pattern) } }
      return nil if fired.empty?

      {
        care_level: "emergency",
        specialty: "emergency",
        red_flags: fired.map { |rule| rule[:label] },
        rule_ids: fired.map { |rule| rule[:id] }
      }
    end

    private

    # Lowercased, punctuation stripped to spaces, whitespace collapsed.
    # Apostrophes survive so "can't breathe" matches as written; the rule lists
    # carry the apostrophe-less spelling too, since patients drop them.
    def normalized
      @normalized ||= @text.to_s.downcase.gsub(/[^a-z0-9'\s]/, " ").squish
    end

    # True when the phrase appears at least once *without* a negator in front of
    # it. "no chest pain, but coughing up blood" negates the cardiac rule and
    # still fires the hemorrhage rule, which is the intent.
    def affirmative_match?(phrase)
      match_offsets(phrase).any? { |offset| !negated_at?(offset) }
    end

    # Leading word boundary only, so "chest pain" also matches "chest pains".
    def match_offsets(phrase)
      offsets = []
      normalized.scan(/\b#{Regexp.escape(phrase)}/) { offsets << Regexp.last_match.begin(0) }
      offsets
    end

    def negated_at?(offset)
      preceding = normalized[0...offset].split(" ").last(NEGATION_WINDOW)
      preceding.any? { |word| NEGATORS.include?(word) }
    end
  end
end
