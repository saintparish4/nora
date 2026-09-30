module Chart
  # Turns an uploaded file into chart text. PDFs are read with pdf-reader;
  # plain text is taken as-is. Scanned PDFs have no text layer and are refused
  # rather than stored empty.
  class TextExtractor
    class Error < StandardError; end

    MAX_BYTES = 10.megabytes
    TEXT_TYPES = %w[text/plain text/markdown text/csv].freeze

    def self.call(file) = new(file).call

    def initialize(file)
      @file = file
    end

    def call
      raise Error, "The file is larger than 10 MB." if @file.size > MAX_BYTES

      text =
        if pdf?
          read_pdf
        elsif TEXT_TYPES.include?(@file.content_type) || @file.original_filename.to_s.match?(/\.(txt|md)\z/i)
          @file.read.to_s.dup.force_encoding(Encoding::UTF_8).scrub("")
        else
          raise Error, "Upload a PDF or a plain-text file."
        end

      text = text.gsub(/[ \t]+\n/, "\n").gsub(/\n{3,}/, "\n\n").strip
      raise Error, "No text could be read from that file. Scanned PDFs are not supported yet; paste the text instead." if text.empty?

      text
    end

    private

    def pdf?
      @file.content_type == "application/pdf" || @file.original_filename.to_s.downcase.end_with?(".pdf")
    end

    def read_pdf
      reader = PDF::Reader.new(@file.tempfile || StringIO.new(@file.read))
      reader.pages.map(&:text).join("\n\n")
    rescue PDF::Reader::MalformedPDFError, PDF::Reader::UnsupportedFeatureError => e
      raise Error, "That PDF could not be read (#{e.message})."
    end
  end
end
