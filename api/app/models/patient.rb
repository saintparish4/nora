# The subject of a workflow. Patients never sign in.
class Patient < ApplicationRecord
  belongs_to :organization
  has_many :coverages, class_name: "PatientCoverage", dependent: :destroy
  has_many :chart_documents, dependent: :restrict_with_error
  has_many :prior_authorizations, dependent: :restrict_with_error

  validates :first_name, :last_name, :date_of_birth, presence: true
  validates :mrn, uniqueness: { scope: :organization_id }, allow_blank: true
  validates :sex, inclusion: { in: %w[female male other unknown] }, allow_blank: true
  validate :date_of_birth_in_past

  normalizes :mrn, with: ->(value) { value.strip.presence }

  scope :search, lambda { |query|
    term = "%#{sanitize_sql_like(query.to_s.strip.downcase)}%"
    where("LOWER(first_name) LIKE :t OR LOWER(last_name) LIKE :t OR LOWER(mrn) LIKE :t", t: term)
  }

  def full_name
    "#{first_name} #{last_name}"
  end

  def as_api_json
    {
      id: id,
      mrn: mrn,
      first_name: first_name,
      last_name: last_name,
      full_name: full_name,
      date_of_birth: date_of_birth,
      sex: sex
    }
  end

  private

  def date_of_birth_in_past
    return if date_of_birth.blank? || date_of_birth <= Date.current

    errors.add(:date_of_birth, "must be in the past")
  end
end
