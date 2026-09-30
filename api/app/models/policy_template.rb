# The criteria a payer (or, with no payer, a common baseline) applies to an
# item. Reference data shared by every organization.
class PolicyTemplate < ApplicationRecord
  ITEM_KINDS = %w[medication procedure imaging].freeze

  belongs_to :payer, optional: true
  has_many :criteria, -> { order(:position) }, class_name: "PolicyCriterion", dependent: :destroy

  validates :item_kind, inclusion: { in: ITEM_KINDS }
  validates :item_name, :title, presence: true

  # The payer's own template when there is one, otherwise the generic baseline.
  def self.resolve(item_name:, payer:)
    scope = where("LOWER(item_name) = ?", item_name.to_s.downcase).order(version: :desc)
    scope.find_by(payer: payer) || scope.find_by(payer: nil)
  end

  def generic?
    payer_id.nil?
  end

  def as_api_json(include_criteria: false)
    json = {
      id: id,
      item_kind: item_kind,
      item_name: item_name,
      item_code: item_code,
      title: title,
      payer: payer && { id: payer.id, name: payer.name },
      generic: generic?,
      effective_on: effective_on,
      source_url: source_url,
      notes: notes,
      version: version
    }
    json[:criteria] = criteria.map(&:as_api_json) if include_criteria
    json
  end
end
