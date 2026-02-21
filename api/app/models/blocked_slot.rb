class BlockedSlot < ApplicationRecord
  belongs_to :provider

  validates :start_time, presence: true
  validates :end_time, presence: true
  validates :source, inclusion: { in: %w[manual google_calendar] }
  validate :end_after_start

  scope :overlapping, ->(start_time, end_time) {
    where("start_time < ? AND end_time > ?", end_time, start_time)
  }

  scope :for_range, ->(start_date, end_date) {
    where("start_time < ? AND end_time > ?", end_date, start_date)
  }

  private

  def end_after_start
    return if start_time.blank? || end_time.blank?

    errors.add(:end_time, "must be after start time") if end_time <= start_time
  end
end
