class Appointment < ApplicationRecord
  # no_show is distinct from cancelled: a cancellation frees the slot, a
  # no-show burns it. They are also different triage signals, and the no-show
  # rate is the number a practice administrator already feels.
  STATUSES = %w[pending confirmed cancelled completed no_show].freeze

  # How a terminal status maps onto what the triage record should say happened.
  # pending and confirmed are deliberately absent — nothing has happened yet.
  OUTCOME_FOR_STATUS = {
    "completed" => "attended",
    "no_show" => "no_show",
    "cancelled" => "cancelled"
  }.freeze

  belongs_to :patient, class_name: "User", foreign_key: "patient_id"
  belongs_to :provider

  # The triage that led here, when the booking came out of a recommendation.
  has_many :risk_assessments, dependent: :nullify

  validates :start_time, presence: true
  validates :end_time, presence: true
  validates :status, inclusion: { in: STATUSES }

  validate :end_time_after_start_time
  validate :no_overlapping_appointments
  validate :not_in_the_past

  scope :upcoming, -> { where("start_time >= ?", Time.current).order(:start_time) }
  scope :past, -> { where("start_time < ?", Time.current).order(start_time: :desc) }
  scope :for_provider, ->(provider_id) { where(provider_id: provider_id) }
  scope :for_patient, ->(patient_id) { where(patient_id: patient_id) }
  scope :confirmed, -> { where(status: "confirmed") }
  scope :active, -> { where(status: %w[pending confirmed]) }

  after_create :send_booking_notifications
  after_update :propagate_outcome_to_risk_assessments, if: :saved_change_to_status?

  def duration_in_minutes
    ((end_time - start_time) / 60).to_i
  end

  def formatted_time
    "#{start_time.strftime('%b %d, %Y at %I:%M %p')} - #{end_time.strftime('%I:%M %p')}"
  end

  def no_show?
    status == "no_show"
  end

  private

  # Closes the loop: once the appointment reaches a terminal state, the triage
  # that produced it learns what happened. Best-effort — a reporting write must
  # never block or roll back a real appointment update.
  def propagate_outcome_to_risk_assessments
    outcome = OUTCOME_FOR_STATUS[status]
    return if outcome.blank?

    risk_assessments.find_each { |assessment| assessment.record_outcome!(outcome) }
  rescue StandardError => e
    Rails.logger.error("[OUTCOME_PROPAGATION_FAILURE] appointment=#{id} error=#{e.class}: #{e.message}")
    Sentry.capture_exception(e) if defined?(Sentry)
  end

  def end_time_after_start_time
    return if end_time.blank? || start_time.blank?

    if end_time <= start_time
      errors.add(:end_time, "must be after start time")
    end
  end

  def not_in_the_past
    return if start_time.blank?

    if start_time < Time.current
      errors.add(:start_time, "cannot be in the past")
    end
  end

  def no_overlapping_appointments
    return if start_time.blank? || end_time.blank?

    overlapping = Appointment.where(provider_id: provider_id)
                             .where.not(id: id)
                             .where(status: %w[pending confirmed])
                             .where("start_time < ? AND end_time > ?", end_time, start_time)

    if overlapping.exists?
      errors.add(:base, "This time slot is no longer available")
    end
  end

  def send_booking_notifications
    AppointmentMailer.booking_confirmation(self).deliver_later
  end
end
