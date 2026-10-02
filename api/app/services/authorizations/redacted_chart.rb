module Authorizations
  # A patient's chart as a model is allowed to see it: identifiers replaced,
  # split into pieces that fit a call, each piece with a short reference the
  # model quotes from. Also the way back: a quote the model returns is mapped
  # to the original document and offsets, or rejected if it is not there.
  class RedactedChart
    Piece = Struct.new(:ref, :document, :redactor, :offset, :text)

    # @param max_chars [Integer] the most chart text to put in one call
    def initialize(documents, patient:, coverage:, max_chars:)
      @max_chars = max_chars
      counter = 0
      @pieces = documents.flat_map do |document|
        redactor = Chart::Redactor.new(document.body, patient: patient, coverage: coverage)
        split(redactor.text).map do |offset, text|
          counter += 1
          Piece.new("D#{counter}", document, redactor, offset, text)
        end
      end
    end

    # @return [Array<Array<Piece>>] the pieces grouped so no group exceeds the
    #   per-call budget
    def chunks
      groups = [ [] ]
      size = 0
      @pieces.each do |piece|
        if size + piece.text.length > @max_chars && groups.last.any?
          groups << []
          size = 0
        end
        groups.last << piece
        size += piece.text.length
      end
      groups
    end

    # The documents block of a prompt.
    def self.render(chunk)
      chunk.flat_map do |piece|
        document = piece.document
        [ "=== #{piece.ref} | #{document.kind} | #{document.occurred_on || 'undated'} | #{document.title} ===", piece.text, "" ]
      end.join("\n")
    end

    # @return [Array(ChartDocument, Integer, Integer), nil] where the quote
    #   sits in the original document, or nil when it is not in the chart word
    #   for word
    def self.locate(chunk, ref, quote)
      piece = chunk.find { |candidate| candidate.ref == ref.to_s } or return nil
      range = QuoteLocator.locate(piece.text, quote) or return nil
      original = piece.redactor.original_range(piece.offset + range[0], piece.offset + range[1]) or return nil

      [ piece.document, *original ]
    end

    private

    # Split an over-long document on paragraph breaks. Returns [offset, text]
    # pairs.
    def split(text)
      return [ [ 0, text ] ] if text.length <= @max_chars

      parts = []
      start = 0
      while start < text.length
        finish = [ start + @max_chars, text.length ].min
        if finish < text.length
          brk = text.rindex("\n\n", finish) || text.rindex("\n", finish)
          finish = brk + 1 if brk && brk > start
        end
        parts << [ start, text[start...finish] ]
        start = finish
      end
      parts
    end
  end
end
