class Appointment < ApplicationRecord
  belongs_to :patient, class_name: "User", foreign_key: "patient_id"
  belongs_to :provider

  validates :start_time, presence: true
  validates :end_time, presence: true
  validates :status, inclusion: { in: %w[pending confirmed cancelled completed] }

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

  def duration_in_minutes
    ((end_time - start_time) / 60).to_i
  end

  def formatted_time
    "#{start_time.strftime('%b %d, %Y at %I:%M %p')} - #{end_time.strftime('%I:%M %p')}"
  end

  private

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
