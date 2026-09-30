# A practice. Every workflow record is scoped to one, and staff share its
# patients.
class Organization < ApplicationRecord
  has_many :users, dependent: :restrict_with_error
  has_many :patients, dependent: :restrict_with_error
  has_many :chart_documents, dependent: :restrict_with_error
  has_many :prior_authorizations, dependent: :restrict_with_error
  has_many :tasks, dependent: :restrict_with_error
  has_many :workflow_events, dependent: :restrict_with_error

  validates :name, presence: true, length: { maximum: 200 }
  validates :npi, format: { with: /\A\d{10}\z/, message: "must be 10 digits" }, allow_blank: true
  validates :timezone, presence: true

  def as_api_json
    { id: id, name: name, npi: npi, timezone: timezone }
  end
end
