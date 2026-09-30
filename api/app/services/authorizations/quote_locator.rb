module Authorizations
  # Finds a quote in a body of text, tolerating differences in whitespace only.
  # Anything looser would let a paraphrase pass as a citation.
  module QuoteLocator
    module_function

    # @return [Array(Integer, Integer), nil] [start, finish) in `body`
    def locate(body, quote, from: 0)
      quote = quote.to_s.strip
      return nil if quote.empty? || body.nil?

      exact = body.index(quote, from)
      return [ exact, exact + quote.length ] if exact

      tokens = quote.split(/\s+/)
      return nil if tokens.empty?

      pattern = Regexp.new(tokens.map { |t| Regexp.escape(t) }.join('\s+'))
      match = pattern.match(body, from)
      match && [ match.begin(0), match.end(0) ]
    end
  end
end
