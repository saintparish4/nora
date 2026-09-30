module Chart
  # Replaces a patient's direct identifiers with placeholders before chart text
  # leaves Nora, and maps positions in the redacted text back to the original.
  #
  # Redaction is minimum-necessary, not de-identification: clinical content is
  # untouched because the criteria are about it.
  class Redactor
    Replacement = Struct.new(:start, :finish, :token)

    attr_reader :text

    def initialize(original, patient:, coverage: nil)
      @original = original
      @patterns = build_patterns(patient, coverage)
      @segments = []
      @text = redact
    end

    # Map a [start, finish) range in the redacted text to the original text.
    # Returns nil when the range starts or ends inside a placeholder, since
    # the model cannot quote an identifier it never saw.
    def original_range(start, finish)
      orig_start = map_offset(start, edge: :start)
      orig_finish = map_offset(finish, edge: :finish)
      return nil if orig_start.nil? || orig_finish.nil? || orig_finish <= orig_start

      [ orig_start, orig_finish ]
    end

    private

    def build_patterns(patient, coverage)
      patterns = []
      name_parts = [ patient.first_name, patient.last_name ].compact_blank.select { |part| part.length >= 2 }
      name_parts.each { |part| patterns << [ /\b#{Regexp.escape(part)}\b/i, "[PATIENT]" ] }
      patterns << [ /\b#{Regexp.escape(patient.mrn)}\b/i, "[MRN]" ] if patient.mrn.present?
      patterns << [ /\b#{Regexp.escape(coverage.member_id)}\b/i, "[MEMBER_ID]" ] if coverage&.member_id.present?
      if patient.date_of_birth
        dob = patient.date_of_birth
        formats = [ dob.strftime("%m/%d/%Y"), dob.strftime("%-m/%-d/%Y"), dob.iso8601, dob.strftime("%m-%d-%Y") ].uniq
        formats.each { |f| patterns << [ /(?<![\d\/-])#{Regexp.escape(f)}(?![\d\/-])/, "[DOB]" ] }
      end
      patterns
    end

    # Collect non-overlapping matches, earliest first, and splice placeholders in.
    def redact
      matches = []
      @patterns.each do |regex, token|
        @original.to_enum(:scan, regex).each do
          m = Regexp.last_match
          matches << Replacement.new(m.begin(0), m.end(0), token)
        end
      end
      matches.sort_by! { |r| [ r.start, -r.finish ] }

      out = +""
      cursor = 0
      matches.each do |r|
        next if r.start < cursor

        out << @original[cursor...r.start]
        @segments << { redacted_start: out.length, redacted_finish: out.length + r.token.length, original_start: r.start, original_finish: r.finish }
        out << r.token
        cursor = r.finish
      end
      out << @original[cursor..].to_s
      out
    end

    def map_offset(offset, edge:)
      shift = 0
      @segments.each do |seg|
        if offset <= seg[:redacted_start]
          break
        elsif offset < seg[:redacted_finish]
          return nil
        elsif offset == seg[:redacted_finish]
          return edge == :finish ? seg[:original_finish] : seg[:original_finish]
        end
        shift = seg[:original_finish] - seg[:redacted_finish]
      end
      offset + shift
    end
  end
end
