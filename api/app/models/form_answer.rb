# An answer a person gave to one of the plan's questions on the request form.
# "manual" when Nora had no answer (usually the prescriber's office's reply),
# "override" when it replaces the one Nora's CQL gave. These are DTR's
# information-origin sources; Nora's own answers are "auto" and never stored.
class FormAnswer < ApplicationRecord
  ORIGINS = %w[manual override].freeze

  belongs_to :prior_authorization
  belongs_to :recorded_by, class_name: "User"

  validates :link_id, presence: true, uniqueness: { scope: :prior_authorization_id }
  validates :origin, inclusion: { in: ORIGINS }
  validate :value_present

  # { codes: [...] } for a choice, { value: "15" } for a number.
  def codes = Array(value&.dig("codes"))

  private

  def value_present
    errors.add(:value, "must give a choice or a number") if codes.empty? && value&.dig("value").blank?
  end
end
