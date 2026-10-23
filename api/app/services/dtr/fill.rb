module Dtr
  # Fills in a payer's DTR package for one request, as a DTR client: runs the
  # CQL the package carried over the patient's chart, adds what staff
  # recorded, and returns the QuestionnaireResponse. Nora fills only the
  # Questionnaires it knows (its own question sets, matched by URL): a form
  # it has never seen has no answer rules to explain a gap with.
  class Fill
    def self.call(...) = new(...).call

    def initialize(prior_authorization, package:, source: Fhir.source)
      @pa = prior_authorization
      @package = package
      @source = source
    end

    # @return [Array<Hash>] one QuestionnaireResponse per Questionnaire in the package
    def call
      elm = Package.elm(@package)
      chart = Fhir::Chart.new(source: @source, patient_id: @pa.patient.fhir_id || raise(Error, "The patient has no FHIR record"))
      Package.questionnaires(@package).map do |questionnaire|
        set = RequestForm::QuestionSet.all.find { |s| s.resource["url"] == questionnaire["url"] } or
          raise Error, "Nora does not know the Questionnaire #{questionnaire['url']}"
        answers = RequestForm::ClinicalAnswers.call(@pa, chart: chart, question_set: set, elm: elm)
        order = chart.medication_requests.find { |rx| RequestForm::AdminFields.prescribes?(rx, @pa.item_name) }
        context = [ chart.coverages.first&.then { |c| "Coverage/#{c['id']}" }, order && "MedicationRequest/#{order['id']}" ].compact
        RequestForm::QuestionnaireResponseBuilder.call(set: set, answers: answers, patient_id: chart.patient_id, context: context)
      end
    end
  end
end
