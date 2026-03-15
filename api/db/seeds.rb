puts "Seeding database..."

# ============================================================================
# DATA CLEANUP
# ============================================================================
# Clear all data and reset auto-increment counters
Appointment.destroy_all
Availability.destroy_all
Provider.destroy_all
User.destroy_all

# Reset SQLite auto-increment counters
ActiveRecord::Base.connection.execute("DELETE FROM sqlite_sequence WHERE name='providers'")
ActiveRecord::Base.connection.execute("DELETE FROM sqlite_sequence WHERE name='availabilities'")
ActiveRecord::Base.connection.execute("DELETE FROM sqlite_sequence WHERE name='appointments'")
ActiveRecord::Base.connection.execute("DELETE FROM sqlite_sequence WHERE name='users'")

# ============================================================================
# TEST USER
# ============================================================================
# Create test user
puts "Creating test user..."
test_user = User.create!(
  email: 'demo@nora.com',
  password: 'password123',
  password_confirmation: 'password123',
  booking_confirmations: true,
  reminders_24h: true,
  cancellation_notices: true
)
puts "Created test user: #{test_user.email}"

# ============================================================================
# PROVIDERS DATA
# ============================================================================
puts "Seeding providers..."

providers_data = [
  # Manhattan - 5 providers (one per specialty)
  { name: "Dr. Sarah Chen", specialty: "Primary Care", bio: "Board-certified internist providing comprehensive primary care. Specializing in preventive medicine and chronic condition management.", location: "Manhattan", hourly_rate: 220.00, experience_years: 14, rating: 4.9, avatar_url: "https://i.pravatar.cc/150?img=1" },
  { name: "Dr. James Morrison", specialty: "Cardiology", bio: "Cardiologist with expertise in heart failure management and cardiovascular prevention. Published researcher.", location: "Manhattan", hourly_rate: 275.00, experience_years: 18, rating: 4.8, avatar_url: "https://i.pravatar.cc/150?img=12" },
  { name: "Dr. Lisa Park", specialty: "Ophthalmology", bio: "Board-certified ophthalmologist specializing in medical and surgical eye care. Expert in cataract and glaucoma management.", location: "Manhattan", hourly_rate: 260.00, experience_years: 16, rating: 4.9, avatar_url: "https://i.pravatar.cc/150?img=5" },
  { name: "Dr. Michael Torres", specialty: "Dentistry", bio: "General and cosmetic dentist. Focus on preventive care, restorative dentistry, and patient comfort.", location: "Manhattan", hourly_rate: 185.00, experience_years: 11, rating: 4.8, avatar_url: "https://i.pravatar.cc/150?img=11" },
  { name: "Dr. Jennifer Walsh", specialty: "Pediatrics", bio: "Board-certified pediatrician. Specializing in well-child care, developmental screening, and common childhood illnesses.", location: "Manhattan", hourly_rate: 195.00, experience_years: 10, rating: 5.0, avatar_url: "https://i.pravatar.cc/150?img=24" },
  # Brooklyn - 5 providers
  { name: "Dr. Rebecca Goldstein", specialty: "Primary Care", bio: "Family medicine physician with focus on preventive care and chronic disease management. Patient-centered approach.", location: "Brooklyn", hourly_rate: 210.00, experience_years: 12, rating: 4.9, avatar_url: "https://i.pravatar.cc/150?img=9" },
  { name: "Dr. David Kim", specialty: "Cardiology", bio: "Interventional cardiologist. Expertise in cardiac catheterization and structural heart disease.", location: "Brooklyn", hourly_rate: 285.00, experience_years: 20, rating: 4.8, avatar_url: "https://i.pravatar.cc/150?img=15" },
  { name: "Dr. Amanda Foster", specialty: "Ophthalmology", bio: "Comprehensive ophthalmologist with subspecialty interest in retinal conditions and diabetic eye disease.", location: "Brooklyn", hourly_rate: 255.00, experience_years: 13, rating: 4.9, avatar_url: "https://i.pravatar.cc/150?img=20" },
  { name: "Dr. Patricia Moore", specialty: "Dentistry", bio: "General dentist with emphasis on family dentistry, oral surgery, and implant planning.", location: "Brooklyn", hourly_rate: 190.00, experience_years: 14, rating: 4.8, avatar_url: "https://i.pravatar.cc/150?img=31" },
  { name: "Dr. Daniel Quinn", specialty: "Pediatrics", bio: "Pediatrician providing comprehensive care for infants through adolescents. Focus on asthma and allergies.", location: "Brooklyn", hourly_rate: 200.00, experience_years: 11, rating: 5.0, avatar_url: "https://i.pravatar.cc/150?img=42" },
  # Washington DC - 5 providers
  { name: "Dr. Angela Davis", specialty: "Primary Care", bio: "Internal medicine physician. Focus on women's health, preventive care, and chronic condition management.", location: "Washington DC", hourly_rate: 215.00, experience_years: 15, rating: 4.9, avatar_url: "https://i.pravatar.cc/150?img=23" },
  { name: "Dr. Robert Hayes", specialty: "Cardiology", bio: "Clinical cardiologist specializing in heart failure, arrhythmias, and preventive cardiology.", location: "Washington DC", hourly_rate: 270.00, experience_years: 19, rating: 4.8, avatar_url: "https://i.pravatar.cc/150?img=33" },
  { name: "Dr. Emily Nguyen", specialty: "Ophthalmology", bio: "Ophthalmologist specializing in refractive surgery, LASIK, and medical eye disease.", location: "Washington DC", hourly_rate: 265.00, experience_years: 12, rating: 4.9, avatar_url: "https://i.pravatar.cc/150?img=17" },
  { name: "Dr. William Brooks", specialty: "Dentistry", bio: "Cosmetic and restorative dentist. Experienced in veneers, whitening, and full-mouth rehabilitation.", location: "Washington DC", hourly_rate: 195.00, experience_years: 16, rating: 4.8, avatar_url: "https://i.pravatar.cc/150?img=18" },
  { name: "Dr. Maria Santos", specialty: "Pediatrics", bio: "Pediatrician with interest in childhood nutrition, growth, and behavioral development.", location: "Washington DC", hourly_rate: 190.00, experience_years: 9, rating: 5.0, avatar_url: "https://i.pravatar.cc/150?img=25" },
  # Miami - 5 providers
  { name: "Dr. Carlos Mendez", specialty: "Primary Care", bio: "Board-certified family medicine physician. Bilingual (English/Spanish). Preventive and chronic care.", location: "Miami", hourly_rate: 205.00, experience_years: 13, rating: 4.9, avatar_url: "https://i.pravatar.cc/150?img=14" },
  { name: "Dr. Thomas Wright", specialty: "Cardiology", bio: "Non-invasive cardiologist. Expertise in echocardiography, stress testing, and preventive cardiology.", location: "Miami", hourly_rate: 268.00, experience_years: 17, rating: 4.8, avatar_url: "https://i.pravatar.cc/150?img=26" },
  { name: "Dr. Rachel Green", specialty: "Ophthalmology", bio: "Board-certified ophthalmologist. Specializing in glaucoma, cataract surgery, and anterior segment.", location: "Miami", hourly_rate: 258.00, experience_years: 14, rating: 4.9, avatar_url: "https://i.pravatar.cc/150?img=27" },
  { name: "Dr. Kevin Patel", specialty: "Dentistry", bio: "General dentist with focus on periodontics and preventive care. Comfort-oriented practice.", location: "Miami", hourly_rate: 180.00, experience_years: 10, rating: 4.8, avatar_url: "https://i.pravatar.cc/150?img=28" },
  { name: "Dr. Nicole Brown", specialty: "Pediatrics", bio: "Board-certified pediatrician. Specializing in newborn care, vaccinations, and acute illness.", location: "Miami", hourly_rate: 192.00, experience_years: 8, rating: 5.0, avatar_url: "https://i.pravatar.cc/150?img=29" },
  # Houston - 5 providers
  { name: "Dr. Karen Williams", specialty: "Primary Care", bio: "Internal medicine physician. Complex chronic disease management and hospital follow-up.", location: "Houston", hourly_rate: 218.00, experience_years: 16, rating: 4.9, avatar_url: "https://i.pravatar.cc/150?img=30" },
  { name: "Dr. Steven Park", specialty: "Cardiology", bio: "Electrophysiologist specializing in arrhythmias, ablation, and device therapy.", location: "Houston", hourly_rate: 290.00, experience_years: 21, rating: 4.8, avatar_url: "https://i.pravatar.cc/150?img=34" },
  { name: "Dr. Linda Chen", specialty: "Ophthalmology", bio: "Ophthalmologist with expertise in medical retina, macular degeneration, and diabetic retinopathy.", location: "Houston", hourly_rate: 262.00, experience_years: 15, rating: 4.9, avatar_url: "https://i.pravatar.cc/150?img=36" },
  { name: "Dr. Brian Adams", specialty: "Dentistry", bio: "General and family dentist. Restorative care, extractions, and emergency dental services.", location: "Houston", hourly_rate: 178.00, experience_years: 12, rating: 4.8, avatar_url: "https://i.pravatar.cc/150?img=38" },
  { name: "Dr. Christopher Davis", specialty: "Pediatrics", bio: "Pediatrician with focus on adolescent medicine and school health. Board certified.", location: "Houston", hourly_rate: 198.00, experience_years: 11, rating: 5.0, avatar_url: "https://i.pravatar.cc/150?img=48" },
  # Chicago - 5 providers
  { name: "Dr. Jennifer Martinez", specialty: "Primary Care", bio: "Family medicine physician. Preventive care, sports medicine, and chronic disease management.", location: "Chicago", hourly_rate: 225.00, experience_years: 14, rating: 4.9, avatar_url: "https://i.pravatar.cc/150?img=41" },
  { name: "Dr. Mark Johnson", specialty: "Cardiology", bio: "Cardiologist focused on preventive cardiology, lipid management, and cardiac imaging.", location: "Chicago", hourly_rate: 272.00, experience_years: 18, rating: 4.8, avatar_url: "https://i.pravatar.cc/150?img=45" },
  { name: "Dr. Susan Lee", specialty: "Ophthalmology", bio: "Comprehensive ophthalmologist. Cataract surgery, glaucoma, and general eye care.", location: "Chicago", hourly_rate: 260.00, experience_years: 13, rating: 4.9, avatar_url: "https://i.pravatar.cc/150?img=47" },
  { name: "Dr. Nancy Clark", specialty: "Dentistry", bio: "General dentist. Emphasis on preventive care, pediatric dentistry, and sedation options.", location: "Chicago", hourly_rate: 188.00, experience_years: 13, rating: 4.8, avatar_url: "https://i.pravatar.cc/150?img=54" },
  { name: "Dr. Ryan Mitchell", specialty: "Pediatrics", bio: "Pediatrician specializing in developmental pediatrics and children with special healthcare needs.", location: "Chicago", hourly_rate: 202.00, experience_years: 10, rating: 5.0, avatar_url: "https://i.pravatar.cc/150?img=56" },
  # Los Angeles - 5 providers
  { name: "Dr. Elizabeth Taylor", specialty: "Primary Care", bio: "Board-certified internist. Interest in geriatric medicine and polypharmacy management.", location: "Los Angeles", hourly_rate: 230.00, experience_years: 17, rating: 4.9, avatar_url: "https://i.pravatar.cc/150?img=50" },
  { name: "Dr. Anthony Rivera", specialty: "Cardiology", bio: "Cardiologist with focus on heart failure, cardiac rehabilitation, and preventive care.", location: "Los Angeles", hourly_rate: 280.00, experience_years: 19, rating: 4.8, avatar_url: "https://i.pravatar.cc/150?img=52" },
  { name: "Dr. Jessica White", specialty: "Ophthalmology", bio: "Ophthalmologist specializing in cornea, external disease, and refractive surgery.", location: "Los Angeles", hourly_rate: 268.00, experience_years: 14, rating: 4.9, avatar_url: "https://i.pravatar.cc/150?img=58" },
  { name: "Dr. Robert Martinez", specialty: "Dentistry", bio: "Cosmetic and general dentist. Expert in dental implants and smile makeovers.", location: "Los Angeles", hourly_rate: 200.00, experience_years: 15, rating: 4.8, avatar_url: "https://i.pravatar.cc/150?img=60" },
  { name: "Dr. Lisa Anderson", specialty: "Pediatrics", bio: "Pediatrician with expertise in pediatric emergency medicine and acute care.", location: "Los Angeles", hourly_rate: 205.00, experience_years: 12, rating: 5.0, avatar_url: "https://i.pravatar.cc/150?img=62" },
  # San Francisco - 5 providers
  { name: "Dr. Michael Thompson", specialty: "Primary Care", bio: "Family medicine physician with focus on integrative medicine and preventive care.", location: "San Francisco", hourly_rate: 235.00, experience_years: 15, rating: 4.9, avatar_url: "https://i.pravatar.cc/150?img=64" },
  { name: "Dr. Sarah Johnson", specialty: "Cardiology", bio: "Preventive cardiologist. Expertise in cardiovascular risk assessment and lifestyle medicine.", location: "San Francisco", hourly_rate: 275.00, experience_years: 16, rating: 4.8, avatar_url: "https://i.pravatar.cc/150?img=66" },
  { name: "Dr. David Wilson", specialty: "Ophthalmology", bio: "Retinal specialist. Expert in diabetic retinopathy, macular degeneration, and retinal surgery.", location: "San Francisco", hourly_rate: 270.00, experience_years: 18, rating: 4.9, avatar_url: "https://i.pravatar.cc/150?img=68" },
  { name: "Dr. Amy Rodriguez", specialty: "Dentistry", bio: "General and cosmetic dentist. Focus on minimally invasive dentistry and patient education.", location: "San Francisco", hourly_rate: 195.00, experience_years: 11, rating: 4.8, avatar_url: "https://i.pravatar.cc/150?img=70" },
  { name: "Dr. James Wilson", specialty: "Pediatrics", bio: "Pediatrician specializing in pediatric cardiology and congenital heart disease.", location: "San Francisco", hourly_rate: 210.00, experience_years: 13, rating: 5.0, avatar_url: "https://i.pravatar.cc/150?img=72" }
]

# ============================================================================
# SCHEDULE TEMPLATES
# ============================================================================
# Define schedule templates by specialty type
schedule_templates = {
  medical_specialist: [
    { day: 1, start: '08:00', end: '12:00', available: true },
    { day: 1, start: '13:00', end: '17:00', available: true },
    { day: 2, start: '08:00', end: '12:00', available: true },
    { day: 2, start: '13:00', end: '17:00', available: true },
    { day: 3, start: '08:00', end: '12:00', available: true },
    { day: 3, start: '13:00', end: '17:00', available: true },
    { day: 4, start: '08:00', end: '12:00', available: true },
    { day: 4, start: '13:00', end: '17:00', available: true },
    { day: 5, start: '08:00', end: '13:00', available: true }
  ],
  primary_care: [
    { day: 1, start: '08:00', end: '12:00', available: true },
    { day: 1, start: '13:00', end: '17:00', available: true },
    { day: 2, start: '08:00', end: '12:00', available: true },
    { day: 2, start: '13:00', end: '17:00', available: true },
    { day: 3, start: '08:00', end: '12:00', available: true },
    { day: 3, start: '13:00', end: '17:00', available: true },
    { day: 4, start: '08:00', end: '12:00', available: true },
    { day: 4, start: '13:00', end: '19:00', available: true },
    { day: 5, start: '08:00', end: '14:00', available: true }
  ]
}

# Map specialties to schedule templates
specialty_mappings = {
  'Primary Care' => :primary_care,
  'Cardiology' => :medical_specialist,
  'Ophthalmology' => :medical_specialist,
  'Dentistry' => :medical_specialist,
  'Pediatrics' => :primary_care
}

# ============================================================================
# PROVIDER CREATION
# ============================================================================
# Create all providers with automatic schedule assignment based on specialty
providers_data.each_with_index do |provider_data, index|
  provider = Provider.create!(provider_data)

  # Get the appropriate schedule template for this provider's specialty
  template_key = specialty_mappings[provider_data[:specialty]] || :medical_specialist
  schedule = schedule_templates[template_key]

  # Create availability slots
  schedule.each do |slot|
    provider.availabilities.create!(
      day_of_week: slot[:day],
      start_time: slot[:start],
      end_time: slot[:end],
      is_available: slot[:available]
    )
  end

  puts "Created provider: #{provider.name} (#{provider.specialty}) in #{provider.location}"
  puts "   #{schedule.length} time slots - Template: #{template_key}"
end

# ============================================================================
# SAMPLE APPOINTMENTS
# ============================================================================
# Create some realistic existing appointments to simulate a working system
# Note: provider_index corresponds to the order providers were created above
puts "\nCreating sample appointments..."

appointment_data = [
  # Manhattan providers
  { provider_index: 0, date: Date.today + 1, start_time: '09:00', end_time: '09:30', service: 'Annual Checkup' },
  { provider_index: 1, date: Date.today + 2, start_time: '10:00', end_time: '11:00', service: 'Cardiac Consultation' },
  { provider_index: 2, date: Date.today + 1, start_time: '14:00', end_time: '15:00', service: 'Eye Exam' },
  { provider_index: 3, date: Date.today + 3, start_time: '10:00', end_time: '11:00', service: 'Dental Cleaning' },
  { provider_index: 4, date: Date.today + 2, start_time: '09:00', end_time: '09:30', service: 'Well-Child Visit' },
  # Brooklyn providers
  { provider_index: 5, date: Date.today + 1, start_time: '14:00', end_time: '14:30', service: 'Blood Pressure Follow-up' },
  { provider_index: 6, date: Date.today + 4, start_time: '14:00', end_time: '15:00', service: 'EKG Interpretation' },
  { provider_index: 7, date: Date.today + 2, start_time: '10:00', end_time: '11:00', service: 'Retinal Exam' },
  { provider_index: 8, date: Date.today + 3, start_time: '11:00', end_time: '12:00', service: 'Dental Checkup' },
  { provider_index: 9, date: Date.today + 1, start_time: '10:00', end_time: '10:30', service: 'Vaccination' }
]

providers = Provider.all.to_a

appointment_data.each do |apt|
  provider = providers[apt[:provider_index]]

  # Skip if provider doesn't exist (safety check)
  next unless provider

  # Combine date and time into datetime objects
  start_datetime = Time.zone.parse("#{apt[:date]} #{apt[:start_time]}")
  end_datetime = Time.zone.parse("#{apt[:date]} #{apt[:end_time]}")

  appointment = Appointment.create!(
    patient: test_user,
    provider: provider,
    start_time: start_datetime,
    end_time: end_datetime,
    status: 'confirmed',
    notes: "#{apt[:service]} - Sample appointment created during seeding"
  )
  puts "   Booked: #{provider.name} on #{apt[:date].strftime('%A, %b %d')} at #{apt[:start_time]} (#{apt[:service]})"
end

# ============================================================================
# SEEDING SUMMARY
# ============================================================================
puts "\nSeeding complete!"
puts "   #{Provider.count} providers across major US cities"
puts "   #{Appointment.count} sample existing appointments"
puts "   1 test user (#{test_user.email})"
puts ""
puts "Provider Distribution by City:"
providers.group_by(&:location).sort_by { |city, _| city }.each do |city, city_providers|
  puts "   • #{city}: #{city_providers.count} providers"
end
puts ""
puts "Provider Distribution by Specialty:"
providers.group_by(&:specialty).sort_by { |_, p| -p.count }.each do |specialty, spec_providers|
  puts "   • #{specialty}: #{spec_providers.count} provider#{'s' if spec_providers.count > 1}"
end
puts ""
puts "Sample Provider Details (first 10):"
providers.first(10).each do |provider|
  availability_count = provider.availabilities.count
  total_hours = provider.availabilities.sum { |a|
    start_seconds = a.start_time.hour * 3600 + a.start_time.min * 60
    end_seconds = a.end_time.hour * 3600 + a.end_time.min * 60
    (end_seconds - start_seconds) / 3600.0
  }
  puts "   • #{provider.name} (#{provider.specialty}) - #{provider.location}"
  puts "     #{availability_count} time slots, ~#{total_hours.round(1)} hours/week, $#{provider.hourly_rate}/hr"
end
puts ""
puts "Test Login Credentials:"
puts "   Email: demo@nora.com"
puts "   Password: password123"
