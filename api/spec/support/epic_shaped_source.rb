# frozen_string_literal: true

# A FHIR source that serves the same charts the way Epic does: each
# MedicationRequest names its drug by reference to a Medication resource
# (medicationReference) instead of carrying the code itself.
class EpicShapedSource
  def initialize(source)
    @source = source
    @medications = {}
  end

  def read(type, id)
    type == 'Medication' ? @medications[id] : @source.read(type, id)
  end

  def search(type, params = {})
    found = @source.search(type, params)
    type == 'MedicationRequest' ? found.map { |order| by_reference(order) } : found
  end

  private

  def by_reference(order)
    code = order['medicationCodeableConcept'] or return order

    id = "med-#{order['id']}"
    @medications[id] = { 'resourceType' => 'Medication', 'id' => id, 'code' => code.except('text').merge('text' => code['text'].to_s.upcase) }
    order.except('medicationCodeableConcept').merge('medicationReference' => { 'reference' => "Medication/#{id}", 'display' => code['text'] })
  end
end
