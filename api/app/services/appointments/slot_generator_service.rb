module Appointments
  class SlotGeneratorService
    SLOT_DURATION = 30.minutes
    DAYS_AHEAD = 14
    
    def initialize(provider)
      @provider = provider
    end
    
    def generate_available_slots
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
        
        # Check if slot is available (not booked AND not blocked)
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
    
    def slot_unavailable?(start_time, end_time)
      @provider.appointments
               .where.not(status: 'cancelled')
               .where('start_time < ? AND end_time > ?', end_time, start_time)
               .exists?
    end
  end
end
