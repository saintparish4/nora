require "net/http"

module Dtr
  # Asks a payer for the questions it wants answered, as a Da Vinci DTR
  # client: POST [base]/Questionnaire/$questionnaire-package with the
  # coverage and the order, authorized with SMART Backend Services.
  class PayerClient
    INPUT_PROFILE = "http://hl7.org/fhir/us/davinci-dtr/StructureDefinition/dtr-qpackage-input-parameters".freeze
    TIMEOUT = 20

    def initialize(base:, auth:)
      @base = base.chomp("/")
      @auth = auth
    end

    # @return [Hash] the payer's Parameters, with one PackageBundle per form
    def questionnaire_package(coverage:, order:)
      body = { "resourceType" => "Parameters", "meta" => { "profile" => [ INPUT_PROFILE ] },
               "parameter" => [ { "name" => "coverage", "resource" => coverage }, { "name" => "order", "resource" => order } ] }
      uri = URI("#{@base}/Questionnaire/$questionnaire-package")
      request = Net::HTTP::Post.new(uri, "Content-Type" => "application/fhir+json", "Accept" => "application/fhir+json",
                                         "Authorization" => "Bearer #{@auth.token}")
      request.body = JSON.generate(body)
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: TIMEOUT, read_timeout: TIMEOUT) do |http|
        http.request(request)
      end
      raise Error, "#{response.code} from the payer for $questionnaire-package" unless response.is_a?(Net::HTTPSuccess)

      JSON.parse(response.body)
    rescue SocketError, Errno::ECONNREFUSED, Net::OpenTimeout, Net::ReadTimeout => e
      raise Error, "Could not reach the payer: #{e.class.name.demodulize}"
    end
  end
end
