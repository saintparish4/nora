module Appointments
  class SlotGeneratorService
    SLOT_DURATION = 30.minutes
    DAYS_AHEAD = 14

    def initialize(provider)
      @provider = provider
    end

    def generate_available_slots
      # Preload all booked appointments and blocked slots for the full date
      # range in a single query each, eliminating per-slot DB hits.
      # Without this, slot_unavailable? fires 2 queries × ~240 slots = ~480
      # queries per provider. With preloading: 2 queries total.
      range_start = Time.current.beginning_of_day
      range_end   = (Date.current + DAYS_AHEAD).end_of_day

      @booked_appointments = @provider.appointments
                                      .where.not(status: "cancelled")
                                      .where(start_time: range_start..range_end)
                                      .pluck(:start_time, :end_time)

      @blocked_slots = @provider.blocked_slots
                                .where(start_time: range_start..range_end)
                                .pluck(:start_time, :end_time)

      slots = []
      (0..DAYS_AHEAD).each do |days_from_now|
        date = Date.current + days_from_now
        slots.concat(slots_for_date(date))
      end

      slots
    end

    private

    def slots_for_date(date)
      day_of_week = date.wday
      availability = @provider.availabilities.find_by(day_of_week: day_of_week)

      return [] unless availability&.is_available

      slots = []
      current_time = Time.zone.parse("#{date} #{availability.start_time}")
      end_time = Time.zone.parse("#{date} #{availability.end_time}")

      now = Time.current
      current_time = now if current_time < now

      while current_time + SLOT_DURATION <= end_time
        slot_end = current_time + SLOT_DURATION

        unless slot_unavailable?(current_time, slot_end)
          slots << {
            start_time: current_time.iso8601,
            end_time: slot_end.iso8601,
            date: date.to_s,
            time: current_time.strftime('%I:%M %p')
          }
        end

        current_time += SLOT_DURATION
      end

      slots
    end

    # Overlap check performed entirely in Ruby against the preloaded arrays.
    # An appointment/blocked-slot overlaps a candidate slot when:
    #   existing.start_time < candidate.end_time AND existing.end_time > candidate.start_time
    def slot_unavailable?(start_time, end_time)
      @booked_appointments.any? { |s, e| s < end_time && e > start_time } ||
        @blocked_slots.any? { |s, e| s < end_time && e > start_time }
    end
  end
end
