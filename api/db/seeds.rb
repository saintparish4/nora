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
  email: 'saintparish6@gmail.com',
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
  # NEW YORK CITY PROVIDERS
  {
    name: "Dr. Michael Thompson",
    specialty: "Mental Health Counseling",
    bio: "Licensed clinical psychologist specializing in cognitive behavioral therapy and mindfulness-based interventions. Supporting individuals through life transitions.",
    location: "New York, NY",
    hourly_rate: 150.00,
    experience_years: 12,
    rating: 5.0,
    avatar_url: "https://i.pravatar.cc/150?img=13"
  },
  {
    name: "Dr. Rebecca Goldstein",
    specialty: "Primary Care",
    bio: "Board-certified internist providing comprehensive primary care. Specializing in preventive medicine and managing chronic conditions.",
    location: "New York, NY",
    hourly_rate: 220.00,
    experience_years: 18,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=44"
  },
  {
    name: "Dr. James Morrison",
    specialty: "Cardiology",
    bio: "Leading cardiologist with expertise in heart failure management and cardiovascular disease prevention. Published researcher and clinical expert.",
    location: "New York, NY",
    hourly_rate: 275.00,
    experience_years: 22,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=56"
  },
  {
    name: "Sarah Martinez",
    specialty: "Personal Training",
    bio: "ACE certified personal trainer specializing in functional fitness and athletic performance. Former Division I athlete.",
    location: "New York, NY",
    hourly_rate: 95.00,
    experience_years: 8,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=22"
  },
  {
    name: "Dr. Linda Chen",
    specialty: "Dermatology",
    bio: "Board-certified dermatologist specializing in medical and cosmetic dermatology. Expert in laser treatments and skin cancer detection.",
    location: "New York, NY",
    hourly_rate: 200.00,
    experience_years: 14,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=31"
  },
  {
    name: "Maya Patel",
    specialty: "Yoga Instruction",
    bio: "500-hour certified yoga instructor specializing in Ashtanga and therapeutic yoga. Teaching for over a decade.",
    location: "New York, NY",
    hourly_rate: 85.00,
    experience_years: 11,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=41"
  },
  {
    name: "Dr. Steven Park",
    specialty: "Psychiatry",
    bio: "Board-certified psychiatrist focusing on anxiety disorders, depression, and medication management. Integrative mental health approach.",
    location: "New York, NY",
    hourly_rate: 180.00,
    experience_years: 16,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=33"
  },
  
  # WASHINGTON DC PROVIDERS
  {
    name: "Dr. Angela Davis",
    specialty: "Primary Care",
    bio: "Family medicine physician with focus on women's health and pediatric care. Compassionate, patient-centered approach.",
    location: "Washington, DC",
    hourly_rate: 210.00,
    experience_years: 13,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=5"
  },
  {
    name: "Dr. Marcus Washington",
    specialty: "Internal Medicine",
    bio: "Experienced internist specializing in diabetes management and hypertension. Evidence-based care for complex conditions.",
    location: "Washington, DC",
    hourly_rate: 195.00,
    experience_years: 17,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=12"
  },
  {
    name: "Dr. Samantha Lee",
    specialty: "Psychology",
    bio: "Clinical psychologist specializing in trauma therapy and relationship counseling. EMDR and DBT certified.",
    location: "Washington, DC",
    hourly_rate: 160.00,
    experience_years: 10,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=26"
  },
  {
    name: "Kevin Johnson",
    specialty: "Physical Therapy",
    bio: "Licensed PT specializing in orthopedic rehabilitation and post-surgical recovery. Sports medicine background.",
    location: "Washington, DC",
    hourly_rate: 130.00,
    experience_years: 9,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=51"
  },
  {
    name: "Dr. Patricia Williams",
    specialty: "Pediatrics",
    bio: "Board-certified pediatrician providing comprehensive care from newborns to adolescents. Warm, family-focused practice.",
    location: "Washington, DC",
    hourly_rate: 185.00,
    experience_years: 15,
    rating: 5.0,
    avatar_url: "https://i.pravatar.cc/150?img=10"
  },
  
  # CHICAGO PROVIDERS
  {
    name: "Dr. Jennifer Martinez",
    specialty: "Primary Care",
    bio: "Board-certified family medicine physician providing comprehensive care for all ages. Focused on preventive medicine and chronic disease management.",
    location: "Chicago, IL",
    hourly_rate: 200.00,
    experience_years: 15,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=10"
  },
  {
    name: "Dr. Robert Chen",
    specialty: "Cardiology",
    bio: "Interventional cardiologist with expertise in complex cardiac procedures. Leading provider in cardiac catheterization.",
    location: "Chicago, IL",
    hourly_rate: 260.00,
    experience_years: 20,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=33"
  },
  {
    name: "Dr. Lisa Anderson",
    specialty: "Endocrinology",
    bio: "Endocrinologist specializing in diabetes, thyroid disorders, and hormonal imbalances. Comprehensive metabolic care.",
    location: "Chicago, IL",
    hourly_rate: 190.00,
    experience_years: 12,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=47"
  },
  {
    name: "Marcus Thompson",
    specialty: "Personal Training",
    bio: "NASM certified trainer specializing in strength and conditioning. Experience with professional athletes.",
    location: "Chicago, IL",
    hourly_rate: 90.00,
    experience_years: 7,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=14"
  },
  {
    name: "Dr. Emily Roberts",
    specialty: "OB/GYN",
    bio: "Board-certified obstetrician-gynecologist providing comprehensive women's healthcare. Prenatal care specialist.",
    location: "Chicago, IL",
    hourly_rate: 215.00,
    experience_years: 14,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=9"
  },
  {
    name: "Jessica Wong",
    specialty: "Nutrition Counseling",
    bio: "Registered dietitian specializing in sports nutrition and weight management. Evidence-based nutrition therapy.",
    location: "Chicago, IL",
    hourly_rate: 100.00,
    experience_years: 8,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=24"
  },
  
  # DALLAS PROVIDERS
  {
    name: "Dr. William Garcia",
    specialty: "Primary Care",
    bio: "Family physician with emphasis on preventive care and chronic disease management. Bilingual English-Spanish.",
    location: "Dallas, TX",
    hourly_rate: 190.00,
    experience_years: 16,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=17"
  },
  {
    name: "Dr. Nicole Johnson",
    specialty: "Dermatology",
    bio: "Board-certified dermatologist specializing in skin cancer surgery and cosmetic procedures. Mohs surgery certified.",
    location: "Dallas, TX",
    hourly_rate: 185.00,
    experience_years: 11,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=20"
  },
  {
    name: "Dr. Carlos Rodriguez",
    specialty: "Orthopedics",
    bio: "Orthopedic surgeon specializing in sports medicine and joint replacement. Fellowship-trained in arthroscopy.",
    location: "Dallas, TX",
    hourly_rate: 240.00,
    experience_years: 18,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=32"
  },
  {
    name: "Amanda Foster",
    specialty: "Physical Therapy",
    bio: "Licensed physical therapist specializing in manual therapy and sports rehabilitation. Dry needling certified.",
    location: "Dallas, TX",
    hourly_rate: 120.00,
    experience_years: 10,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=48"
  },
  {
    name: "Dr. Michelle Taylor",
    specialty: "Psychiatry",
    bio: "Board-certified psychiatrist with focus on adult ADHD and mood disorders. Medication management specialist.",
    location: "Dallas, TX",
    hourly_rate: 170.00,
    experience_years: 13,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=38"
  },
  
  # HOUSTON PROVIDERS
  {
    name: "Dr. David Kumar",
    specialty: "Internal Medicine",
    bio: "Board-certified internist with expertise in complex medical conditions and hospital medicine.",
    location: "Houston, TX",
    hourly_rate: 205.00,
    experience_years: 19,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=15"
  },
  {
    name: "Dr. Sarah Mitchell",
    specialty: "Gastroenterology",
    bio: "Gastroenterologist specializing in digestive disorders, IBD, and endoscopic procedures.",
    location: "Houston, TX",
    hourly_rate: 230.00,
    experience_years: 14,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=27"
  },
  {
    name: "Dr. James Wilson",
    specialty: "Neurology",
    bio: "Board-certified neurologist specializing in headache medicine and movement disorders.",
    location: "Houston, TX",
    hourly_rate: 220.00,
    experience_years: 16,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=53"
  },
  {
    name: "Crystal Hayes",
    specialty: "Massage Therapy",
    bio: "Licensed massage therapist specializing in therapeutic massage, deep tissue, and trigger point therapy.",
    location: "Houston, TX",
    hourly_rate: 85.00,
    experience_years: 9,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=35"
  },
  {
    name: "Dr. Rachel Green",
    specialty: "Pediatrics",
    bio: "Pediatrician specializing in developmental pediatrics and behavioral health. Child-centered care approach.",
    location: "Houston, TX",
    hourly_rate: 180.00,
    experience_years: 12,
    rating: 5.0,
    avatar_url: "https://i.pravatar.cc/150?img=23"
  },
  
  # MIAMI PROVIDERS
  {
    name: "Dr. Amanda Foster",
    specialty: "Dermatology",
    bio: "Board-certified dermatologist with expertise in medical and cosmetic dermatology. Specializing in acne treatment, skin cancer screening, and anti-aging therapies.",
    location: "Miami, FL",
    hourly_rate: 180.00,
    experience_years: 11,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=20"
  },
  {
    name: "Dr. Jose Martinez",
    specialty: "Primary Care",
    bio: "Family medicine physician with bilingual practice serving diverse communities. Preventive care specialist.",
    location: "Miami, FL",
    hourly_rate: 195.00,
    experience_years: 14,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=61"
  },
  {
    name: "Dr. Isabella Santos",
    specialty: "OB/GYN",
    bio: "Board-certified OB/GYN specializing in high-risk pregnancies and minimally invasive surgery.",
    location: "Miami, FL",
    hourly_rate: 225.00,
    experience_years: 13,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=45"
  },
  {
    name: "Miguel Fernandez",
    specialty: "Personal Training",
    bio: "Certified personal trainer and nutritionist specializing in body transformation and athletic performance.",
    location: "Miami, FL",
    hourly_rate: 88.00,
    experience_years: 6,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=58"
  },
  {
    name: "Dr. Sophia Rodriguez",
    specialty: "Urgent Care",
    bio: "Emergency medicine physician providing comprehensive urgent care services. Quick, quality care for acute illnesses.",
    location: "Miami, FL",
    hourly_rate: 170.00,
    experience_years: 10,
    rating: 4.6,
    avatar_url: "https://i.pravatar.cc/150?img=26"
  },
  
  # LOS ANGELES PROVIDERS
  {
    name: "Marcus Johnson",
    specialty: "Personal Training",
    bio: "NASM certified personal trainer focused on strength training and body composition. Former college athlete with a passion for helping clients achieve their fitness goals.",
    location: "Los Angeles, CA",
    hourly_rate: 85.00,
    experience_years: 6,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=12"
  },
  {
    name: "Dr. Rachel Kim",
    specialty: "Dermatology",
    bio: "Celebrity dermatologist specializing in aesthetic treatments and laser procedures. Advanced cosmetic expertise.",
    location: "Los Angeles, CA",
    hourly_rate: 210.00,
    experience_years: 15,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=42"
  },
  {
    name: "Dr. Christopher Brown",
    specialty: "Cardiology",
    bio: "Preventive cardiologist focusing on heart health optimization and cardiovascular disease prevention.",
    location: "Los Angeles, CA",
    hourly_rate: 255.00,
    experience_years: 17,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=29"
  },
  {
    name: "Jasmine Patel",
    specialty: "Yoga Instruction",
    bio: "Certified yoga therapist specializing in healing yoga and meditation. 15+ years of teaching experience.",
    location: "Los Angeles, CA",
    hourly_rate: 80.00,
    experience_years: 15,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=49"
  },
  {
    name: "Dr. Daniel Green",
    specialty: "Mental Health Counseling",
    bio: "Licensed therapist specializing in entertainment industry professionals and performance anxiety.",
    location: "Los Angeles, CA",
    hourly_rate: 165.00,
    experience_years: 11,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=69"
  },
  {
    name: "Emma Watson",
    specialty: "Nutrition Counseling",
    bio: "Registered dietitian specializing in plant-based nutrition and sustainable eating practices.",
    location: "Los Angeles, CA",
    hourly_rate: 105.00,
    experience_years: 9,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=36"
  },
  
  # SAN FRANCISCO PROVIDERS
  {
    name: "Dr. Sarah Chen",
    specialty: "Physical Therapy",
    bio: "Specialized in sports injury rehabilitation with over 10 years of experience. Helped hundreds of athletes return to peak performance.",
    location: "San Francisco, CA",
    hourly_rate: 125.00,
    experience_years: 10,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=5"
  },
  {
    name: "Alex Wu",
    specialty: "Acupuncture",
    bio: "Licensed acupuncturist and herbalist specializing in pain management, stress relief, and holistic wellness. Traditional Chinese medicine practitioner.",
    location: "San Francisco, CA",
    hourly_rate: 110.00,
    experience_years: 12,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=68"
  },
  {
    name: "Dr. Michael Zhang",
    specialty: "Primary Care",
    bio: "Tech-focused primary care physician specializing in preventive health and wellness optimization.",
    location: "San Francisco, CA",
    hourly_rate: 215.00,
    experience_years: 13,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=64"
  },
  {
    name: "Dr. Jennifer Yang",
    specialty: "Psychiatry",
    bio: "Board-certified psychiatrist specializing in tech industry burnout and stress management.",
    location: "San Francisco, CA",
    hourly_rate: 185.00,
    experience_years: 14,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=43"
  },
  {
    name: "Olivia Martinez",
    specialty: "Pilates Instruction",
    bio: "Certified Pilates instructor specializing in injury rehabilitation and postural alignment.",
    location: "San Francisco, CA",
    hourly_rate: 90.00,
    experience_years: 8,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=52"
  },
  
  # BOULDER PROVIDERS
  {
    name: "Dr. Katherine Moore",
    specialty: "Primary Care",
    bio: "Integrative medicine physician combining conventional and holistic approaches to wellness.",
    location: "Boulder, CO",
    hourly_rate: 190.00,
    experience_years: 11,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=19"
  },
  {
    name: "Jake Harrison",
    specialty: "Physical Therapy",
    bio: "PT specializing in outdoor athletes and adventure sports injuries. Climbing rehabilitation expert.",
    location: "Boulder, CO",
    hourly_rate: 115.00,
    experience_years: 9,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=55"
  },
  {
    name: "Samantha Rivers",
    specialty: "Yoga Instruction",
    bio: "500-RYT instructor specializing in outdoor yoga and mindfulness practices. Mountain yoga specialist.",
    location: "Boulder, CO",
    hourly_rate: 75.00,
    experience_years: 10,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=60"
  },
  {
    name: "Carlos Ramirez",
    specialty: "Pilates Instruction",
    bio: "Certified Pilates instructor with expertise in rehabilitation and core strengthening. Trained in classical and contemporary Pilates methods.",
    location: "Boulder, CO",
    hourly_rate: 75.00,
    experience_years: 7,
    rating: 4.6,
    avatar_url: "https://i.pravatar.cc/150?img=32"
  },
  {
    name: "Dr. Lisa Bennett",
    specialty: "Nutrition Counseling",
    bio: "Sports nutritionist specializing in endurance athletes and performance optimization.",
    location: "Boulder, CO",
    hourly_rate: 98.00,
    experience_years: 12,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=39"
  },
  
  # ATLANTA PROVIDERS
  {
    name: "Dr. Patricia Moore",
    specialty: "Urgent Care",
    bio: "Emergency medicine physician providing urgent care services. Quick diagnosis and treatment for non-life-threatening conditions and injuries.",
    location: "Atlanta, GA",
    hourly_rate: 165.00,
    experience_years: 9,
    rating: 4.6,
    avatar_url: "https://i.pravatar.cc/150?img=26"
  },
  {
    name: "Dr. Marcus Davis",
    specialty: "Primary Care",
    bio: "Family medicine physician with focus on underserved communities and chronic disease management.",
    location: "Atlanta, GA",
    hourly_rate: 185.00,
    experience_years: 14,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=51"
  },
  {
    name: "Dr. Vanessa Johnson",
    specialty: "Cardiology",
    bio: "Cardiologist specializing in preventive cardiology and women's heart health.",
    location: "Atlanta, GA",
    hourly_rate: 240.00,
    experience_years: 16,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=47"
  },
  {
    name: "Tyrone Williams",
    specialty: "Personal Training",
    bio: "Certified strength and conditioning coach specializing in athletic performance and injury prevention.",
    location: "Atlanta, GA",
    hourly_rate: 82.00,
    experience_years: 8,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=62"
  },
  {
    name: "Dr. Lauren Harris",
    specialty: "Psychology",
    bio: "Clinical psychologist specializing in couples therapy and family systems. LGBTQ+ affirming practice.",
    location: "Atlanta, GA",
    hourly_rate: 155.00,
    experience_years: 13,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=28"
  },
  {
    name: "Natasha Brown",
    specialty: "Massage Therapy",
    bio: "Licensed massage therapist specializing in prenatal massage and stress relief techniques.",
    location: "Atlanta, GA",
    hourly_rate: 88.00,
    experience_years: 11,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=37"
  },
  
  # ADDITIONAL SPECIALISTS ACROSS CITIES
  {
    name: "Dr. Thomas Anderson",
    specialty: "Ophthalmology",
    bio: "Board-certified ophthalmologist specializing in cataract surgery and LASIK procedures.",
    location: "New York, NY",
    hourly_rate: 235.00,
    experience_years: 19,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=57"
  },
  {
    name: "Dr. Maria Gonzalez",
    specialty: "ENT (Otolaryngology)",
    bio: "ENT specialist focusing on sinus disorders, hearing loss, and voice disorders.",
    location: "Houston, TX",
    hourly_rate: 210.00,
    experience_years: 15,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=25"
  },
  {
    name: "Dr. Kevin White",
    specialty: "Chiropractic",
    bio: "Chiropractic physician specializing in sports injuries and spinal rehabilitation.",
    location: "Chicago, IL",
    hourly_rate: 95.00,
    experience_years: 10,
    rating: 4.6,
    avatar_url: "https://i.pravatar.cc/150?img=59"
  },
  {
    name: "Hannah Lee",
    specialty: "Occupational Therapy",
    bio: "Licensed occupational therapist specializing in hand therapy and post-stroke rehabilitation.",
    location: "Washington, DC",
    hourly_rate: 105.00,
    experience_years: 8,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=40"
  },
  {
    name: "Brian Mitchell",
    specialty: "Speech Therapy",
    bio: "Speech-language pathologist specializing in adult neurological disorders and voice therapy.",
    location: "San Francisco, CA",
    hourly_rate: 110.00,
    experience_years: 12,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=67"
  },
  {
    name: "Dr. Andrew Sullivan",
    specialty: "Sports Medicine",
    bio: "Sports medicine physician working with collegiate and professional athletes. Injury prevention specialist.",
    location: "Los Angeles, CA",
    hourly_rate: 200.00,
    experience_years: 14,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=54"
  },
  {
    name: "Dr. Victoria Chang",
    specialty: "Rheumatology",
    bio: "Rheumatologist specializing in autoimmune diseases, arthritis, and lupus management.",
    location: "Dallas, TX",
    hourly_rate: 215.00,
    experience_years: 16,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=30"
  },
  {
    name: "Derek Thompson",
    specialty: "Nutrition Counseling",
    bio: "Registered dietitian specializing in sports nutrition for endurance athletes and bodybuilders.",
    location: "Miami, FL",
    hourly_rate: 92.00,
    experience_years: 7,
    rating: 4.6,
    avatar_url: "https://i.pravatar.cc/150?img=63"
  },
  
  # NEW ORLEANS PROVIDERS
  {
    name: "Dr. Marie LeBlanc",
    specialty: "Primary Care",
    bio: "Family medicine physician serving the New Orleans community with a focus on preventive care and chronic disease management.",
    location: "New Orleans, LA",
    hourly_rate: 185.00,
    experience_years: 12,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=16"
  },
  {
    name: "Dr. Antoine Dubois",
    specialty: "Cardiology",
    bio: "Cardiologist specializing in heart disease prevention and management. Expert in cardiovascular health.",
    location: "New Orleans, LA",
    hourly_rate: 250.00,
    experience_years: 18,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=18"
  },
  {
    name: "Dr. Camille Thibodeaux",
    specialty: "Mental Health Counseling",
    bio: "Licensed therapist specializing in trauma recovery and stress management. Culturally sensitive approach.",
    location: "New Orleans, LA",
    hourly_rate: 155.00,
    experience_years: 11,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=21"
  },
  {
    name: "Dr. Robert Boudreaux",
    specialty: "Physical Therapy",
    bio: "Physical therapist specializing in orthopedic rehabilitation and sports medicine. Helping patients return to active lifestyles.",
    location: "New Orleans, LA",
    hourly_rate: 125.00,
    experience_years: 10,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=34"
  },
  {
    name: "Dr. Elizabeth Martin",
    specialty: "Dermatology",
    bio: "Board-certified dermatologist providing comprehensive skin care services including medical and cosmetic treatments.",
    location: "New Orleans, LA",
    hourly_rate: 195.00,
    experience_years: 13,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=46"
  },
  
  # LAS VEGAS PROVIDERS
  {
    name: "Dr. Michael Torres",
    specialty: "Primary Care",
    bio: "Family medicine physician providing comprehensive primary care services to the Las Vegas community.",
    location: "Las Vegas, NV",
    hourly_rate: 190.00,
    experience_years: 14,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=50"
  },
  {
    name: "Dr. Jennifer Walsh",
    specialty: "Urgent Care",
    bio: "Emergency medicine physician providing urgent care services. Quick, efficient care for acute conditions.",
    location: "Las Vegas, NV",
    hourly_rate: 175.00,
    experience_years: 11,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=11"
  },
  {
    name: "Dr. David Kim",
    specialty: "Cardiology",
    bio: "Cardiologist specializing in preventive cardiology and heart disease management.",
    location: "Las Vegas, NV",
    hourly_rate: 245.00,
    experience_years: 16,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=65"
  },
  {
    name: "Dr. Amanda Foster",
    specialty: "Mental Health Counseling",
    bio: "Licensed therapist specializing in anxiety, depression, and stress management. Evening and weekend availability.",
    location: "Las Vegas, NV",
    hourly_rate: 150.00,
    experience_years: 9,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=66"
  },
  {
    name: "Ryan Mitchell",
    specialty: "Personal Training",
    bio: "Certified personal trainer specializing in strength training and body transformation.",
    location: "Las Vegas, NV",
    hourly_rate: 95.00,
    experience_years: 8,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=70"
  },
  
  # SAN DIEGO PROVIDERS
  {
    name: "Dr. Sarah Johnson",
    specialty: "Primary Care",
    bio: "Family medicine physician providing comprehensive primary care with focus on preventive medicine.",
    location: "San Diego, CA",
    hourly_rate: 205.00,
    experience_years: 15,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=1"
  },
  {
    name: "Dr. Mark Thompson",
    specialty: "Sports Medicine",
    bio: "Sports medicine physician working with athletes and active individuals. Injury prevention and treatment specialist.",
    location: "San Diego, CA",
    hourly_rate: 195.00,
    experience_years: 13,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=2"
  },
  {
    name: "Dr. Lisa Chen",
    specialty: "Dermatology",
    bio: "Board-certified dermatologist specializing in medical dermatology and skin cancer screening.",
    location: "San Diego, CA",
    hourly_rate: 200.00,
    experience_years: 12,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=3"
  },
  {
    name: "Dr. James Rodriguez",
    specialty: "Physical Therapy",
    bio: "Physical therapist specializing in sports rehabilitation and orthopedic conditions.",
    location: "San Diego, CA",
    hourly_rate: 130.00,
    experience_years: 11,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=4"
  },
  {
    name: "Maria Santos",
    specialty: "Yoga Instruction",
    bio: "Certified yoga instructor specializing in Vinyasa and restorative yoga. Beach yoga sessions available.",
    location: "San Diego, CA",
    hourly_rate: 85.00,
    experience_years: 9,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=6"
  },
  
  # PHOENIX PROVIDERS
  {
    name: "Dr. Robert Martinez",
    specialty: "Primary Care",
    bio: "Family medicine physician providing comprehensive primary care services to the Phoenix area.",
    location: "Phoenix, AZ",
    hourly_rate: 195.00,
    experience_years: 16,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=7"
  },
  {
    name: "Dr. Patricia Brown",
    specialty: "Cardiology",
    bio: "Cardiologist specializing in preventive cardiology and cardiovascular disease management.",
    location: "Phoenix, AZ",
    hourly_rate: 240.00,
    experience_years: 17,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=8"
  },
  {
    name: "Dr. Kevin Lee",
    specialty: "Dermatology",
    bio: "Board-certified dermatologist specializing in skin cancer detection and treatment. Mohs surgery certified.",
    location: "Phoenix, AZ",
    hourly_rate: 190.00,
    experience_years: 14,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=71"
  },
  {
    name: "Dr. Nancy Garcia",
    specialty: "Mental Health Counseling",
    bio: "Licensed therapist specializing in anxiety, depression, and relationship counseling.",
    location: "Phoenix, AZ",
    hourly_rate: 160.00,
    experience_years: 12,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=72"
  },
  {
    name: "Carlos Mendez",
    specialty: "Physical Therapy",
    bio: "Physical therapist specializing in orthopedic rehabilitation and sports injuries.",
    location: "Phoenix, AZ",
    hourly_rate: 120.00,
    experience_years: 10,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=73"
  },
  
  # SALT LAKE CITY PROVIDERS
  {
    name: "Dr. Emily Anderson",
    specialty: "Primary Care",
    bio: "Family medicine physician providing comprehensive primary care with focus on preventive health.",
    location: "Salt Lake City, UT",
    hourly_rate: 185.00,
    experience_years: 13,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=74"
  },
  {
    name: "Dr. Thomas Wilson",
    specialty: "Cardiology",
    bio: "Cardiologist specializing in heart disease prevention and management.",
    location: "Salt Lake City, UT",
    hourly_rate: 235.00,
    experience_years: 18,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=75"
  },
  {
    name: "Dr. Jennifer Taylor",
    specialty: "Physical Therapy",
    bio: "Physical therapist specializing in sports medicine and orthopedic rehabilitation.",
    location: "Salt Lake City, UT",
    hourly_rate: 115.00,
    experience_years: 11,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=76"
  },
  {
    name: "Dr. Michael Davis",
    specialty: "Mental Health Counseling",
    bio: "Licensed therapist specializing in stress management and anxiety disorders.",
    location: "Salt Lake City, UT",
    hourly_rate: 155.00,
    experience_years: 10,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=77"
  },
  {
    name: "Sarah Johnson",
    specialty: "Nutrition Counseling",
    bio: "Registered dietitian specializing in weight management and sports nutrition.",
    location: "Salt Lake City, UT",
    hourly_rate: 100.00,
    experience_years: 9,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=78"
  },
  
  # DENVER PROVIDERS
  {
    name: "Dr. Christopher Moore",
    specialty: "Primary Care",
    bio: "Family medicine physician providing comprehensive primary care services in Denver.",
    location: "Denver, CO",
    hourly_rate: 200.00,
    experience_years: 15,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=79"
  },
  {
    name: "Dr. Jessica White",
    specialty: "Cardiology",
    bio: "Cardiologist specializing in preventive cardiology and heart health optimization.",
    location: "Denver, CO",
    hourly_rate: 250.00,
    experience_years: 17,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=80"
  },
  {
    name: "Dr. Ryan Harris",
    specialty: "Sports Medicine",
    bio: "Sports medicine physician working with athletes and active individuals. Altitude training specialist.",
    location: "Denver, CO",
    hourly_rate: 195.00,
    experience_years: 12,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=81"
  },
  {
    name: "Dr. Amanda Clark",
    specialty: "Physical Therapy",
    bio: "Physical therapist specializing in sports rehabilitation and outdoor athlete injuries.",
    location: "Denver, CO",
    hourly_rate: 125.00,
    experience_years: 11,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=82"
  },
  {
    name: "Dr. Matthew Lewis",
    specialty: "Mental Health Counseling",
    bio: "Licensed therapist specializing in anxiety, depression, and stress management.",
    location: "Denver, CO",
    hourly_rate: 165.00,
    experience_years: 13,
    rating: 4.7,
    avatar_url: "https://i.pravatar.cc/150?img=83"
  },
  {
    name: "Jennifer Adams",
    specialty: "Yoga Instruction",
    bio: "Certified yoga instructor specializing in power yoga and meditation practices.",
    location: "Denver, CO",
    hourly_rate: 80.00,
    experience_years: 10,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=84"
  },
  
  # BOSTON PROVIDERS
  {
    name: "Dr. Elizabeth Walsh",
    specialty: "Primary Care",
    bio: "Board-certified internist providing comprehensive primary care. Academic medical center background.",
    location: "Boston, MA",
    hourly_rate: 225.00,
    experience_years: 19,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=85"
  },
  {
    name: "Dr. Robert O'Brien",
    specialty: "Cardiology",
    bio: "Cardiologist specializing in interventional cardiology and complex cardiac conditions.",
    location: "Boston, MA",
    hourly_rate: 280.00,
    experience_years: 21,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=86"
  },
  {
    name: "Dr. Catherine Murphy",
    specialty: "Dermatology",
    bio: "Board-certified dermatologist specializing in medical dermatology and skin cancer treatment.",
    location: "Boston, MA",
    hourly_rate: 210.00,
    experience_years: 16,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=87"
  },
  {
    name: "Dr. Patrick Sullivan",
    specialty: "Mental Health Counseling",
    bio: "Licensed clinical psychologist specializing in cognitive behavioral therapy and anxiety disorders.",
    location: "Boston, MA",
    hourly_rate: 175.00,
    experience_years: 14,
    rating: 4.9,
    avatar_url: "https://i.pravatar.cc/150?img=88"
  },
  {
    name: "Dr. Margaret Kelly",
    specialty: "Physical Therapy",
    bio: "Physical therapist specializing in orthopedic rehabilitation and post-surgical recovery.",
    location: "Boston, MA",
    hourly_rate: 135.00,
    experience_years: 12,
    rating: 4.8,
    avatar_url: "https://i.pravatar.cc/150?img=89"
  },
  {
    name: "Dr. Daniel Quinn",
    specialty: "Pediatrics",
    bio: "Board-certified pediatrician providing comprehensive care for children and adolescents.",
    location: "Boston, MA",
    hourly_rate: 195.00,
    experience_years: 15,
    rating: 5.0,
    avatar_url: "https://i.pravatar.cc/150?img=90"
  }
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
  ],
  mental_health: [
    { day: 1, start: '10:00', end: '13:00', available: true },
    { day: 1, start: '14:00', end: '19:00', available: true },
    { day: 2, start: '09:00', end: '12:00', available: true },
    { day: 2, start: '13:00', end: '20:00', available: true },
    { day: 3, start: '13:00', end: '20:00', available: true },
    { day: 4, start: '10:00', end: '13:00', available: true },
    { day: 4, start: '14:00', end: '19:00', available: true },
    { day: 5, start: '09:00', end: '15:00', available: true }
  ],
  physical_therapy: [
    { day: 1, start: '08:00', end: '12:00', available: true },
    { day: 1, start: '13:00', end: '18:00', available: true },
    { day: 2, start: '08:00', end: '12:00', available: true },
    { day: 2, start: '14:00', end: '18:00', available: true },
    { day: 3, start: '09:00', end: '12:00', available: true },
    { day: 3, start: '13:00', end: '17:00', available: true },
    { day: 4, start: '12:00', end: '18:00', available: true },
    { day: 5, start: '08:00', end: '14:00', available: true }
  ],
  fitness_instructor: [
    { day: 1, start: '06:00', end: '09:00', available: true },
    { day: 1, start: '17:00', end: '21:00', available: true },
    { day: 2, start: '06:00', end: '09:00', available: true },
    { day: 2, start: '17:00', end: '21:00', available: true },
    { day: 3, start: '06:00', end: '09:00', available: true },
    { day: 3, start: '11:00', end: '14:00', available: true },
    { day: 3, start: '17:00', end: '21:00', available: true },
    { day: 4, start: '06:00', end: '09:00', available: true },
    { day: 4, start: '17:00', end: '21:00', available: true },
    { day: 5, start: '06:00', end: '12:00', available: true },
    { day: 6, start: '07:00', end: '13:00', available: true }
  ],
  wellness_provider: [
    { day: 1, start: '10:00', end: '13:00', available: true },
    { day: 1, start: '14:00', end: '19:00', available: true },
    { day: 2, start: '12:00', end: '20:00', available: true },
    { day: 3, start: '09:00', end: '15:00', available: true },
    { day: 4, start: '10:00', end: '13:00', available: true },
    { day: 4, start: '15:00', end: '19:00', available: true },
    { day: 5, start: '09:00', end: '13:00', available: true },
    { day: 6, start: '10:00', end: '14:00', available: true }
  ],
  urgent_care: [
    { day: 1, start: '08:00', end: '20:00', available: true },
    { day: 2, start: '08:00', end: '20:00', available: true },
    { day: 3, start: '08:00', end: '20:00', available: true },
    { day: 4, start: '08:00', end: '20:00', available: true },
    { day: 5, start: '08:00', end: '20:00', available: true },
    { day: 6, start: '09:00', end: '17:00', available: true },
    { day: 0, start: '10:00', end: '16:00', available: true }
  ],
  therapeutic_services: [
    { day: 1, start: '12:00', end: '20:00', available: true },
    { day: 2, start: '09:00', end: '13:00', available: true },
    { day: 2, start: '14:00', end: '18:00', available: true },
    { day: 3, start: '10:00', end: '14:00', available: true },
    { day: 3, start: '15:00', end: '19:00', available: true },
    { day: 4, start: '12:00', end: '20:00', available: true },
    { day: 5, start: '09:00', end: '17:00', available: true },
    { day: 6, start: '10:00', end: '16:00', available: true }
  ]
}

# Map specialties to schedule templates
specialty_mappings = {
  'Primary Care' => :primary_care,
  'Internal Medicine' => :primary_care,
  'Family Medicine' => :primary_care,
  'Cardiology' => :medical_specialist,
  'Dermatology' => :medical_specialist,
  'Neurology' => :medical_specialist,
  'Gastroenterology' => :medical_specialist,
  'Endocrinology' => :medical_specialist,
  'Rheumatology' => :medical_specialist,
  'Ophthalmology' => :medical_specialist,
  'ENT (Otolaryngology)' => :medical_specialist,
  'Orthopedics' => :medical_specialist,
  'Sports Medicine' => :medical_specialist,
  'OB/GYN' => :medical_specialist,
  'Pediatrics' => :primary_care,
  'Psychiatry' => :mental_health,
  'Psychology' => :mental_health,
  'Mental Health Counseling' => :mental_health,
  'Physical Therapy' => :physical_therapy,
  'Occupational Therapy' => :therapeutic_services,
  'Speech Therapy' => :therapeutic_services,
  'Personal Training' => :fitness_instructor,
  'Yoga Instruction' => :fitness_instructor,
  'Pilates Instruction' => :fitness_instructor,
  'Nutrition Counseling' => :wellness_provider,
  'Dietitian' => :wellness_provider,
  'Massage Therapy' => :therapeutic_services,
  'Acupuncture' => :wellness_provider,
  'Chiropractic' => :therapeutic_services,
  'Urgent Care' => :urgent_care
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
  # Dr. Sarah Chen appointments (Physical Therapy)
  { provider_index: 0, date: Date.today + 1, start_time: '09:00', end_time: '10:00', service: 'Initial Assessment' },
  { provider_index: 0, date: Date.today + 2, start_time: '14:00', end_time: '15:00', service: 'Follow-up Session' },
  { provider_index: 0, date: Date.today + 3, start_time: '10:00', end_time: '11:00', service: 'Sports Injury Recovery' },
  
  # Marcus Johnson appointments (Personal Training)
  { provider_index: 1, date: Date.today + 1, start_time: '06:00', end_time: '07:00', service: 'Morning Workout' },
  { provider_index: 1, date: Date.today + 1, start_time: '18:00', end_time: '19:00', service: 'Strength Training' },
  { provider_index: 1, date: Date.today + 3, start_time: '07:00', end_time: '08:00', service: 'HIIT Session' },
  
  # Dr. Emily Rodriguez appointments (Nutrition)
  { provider_index: 2, date: Date.today + 2, start_time: '14:00', end_time: '15:00', service: 'Nutrition Consultation' },
  { provider_index: 2, date: Date.today + 4, start_time: '10:00', end_time: '11:00', service: 'Meal Planning Session' },
  
  # James Park appointments (Yoga)
  { provider_index: 3, date: Date.today + 1, start_time: '06:30', end_time: '07:30', service: 'Morning Flow' },
  { provider_index: 3, date: Date.today + 1, start_time: '18:00', end_time: '19:00', service: 'Evening Vinyasa' },
  { provider_index: 3, date: Date.today + 6, start_time: '09:00', end_time: '10:00', service: 'Weekend Restorative' },
  
  # Dr. Michael Thompson appointments (Mental Health)
  { provider_index: 4, date: Date.today + 1, start_time: '14:00', end_time: '15:00', service: 'Therapy Session' },
  { provider_index: 4, date: Date.today + 2, start_time: '16:00', end_time: '17:00', service: 'CBT Session' },
  { provider_index: 4, date: Date.today + 3, start_time: '18:00', end_time: '19:00', service: 'Evening Counseling' },
  
  # Dr. Jennifer Martinez appointments (Primary Care)
  { provider_index: 5, date: Date.today + 1, start_time: '09:00', end_time: '09:30', service: 'Annual Checkup' },
  { provider_index: 5, date: Date.today + 2, start_time: '14:00', end_time: '14:30', service: 'Blood Pressure Follow-up' },
  { provider_index: 5, date: Date.today + 4, start_time: '10:00', end_time: '10:30', service: 'Flu Shot' },
  
  # Dr. Robert Kim appointments (Cardiology)
  { provider_index: 6, date: Date.today + 1, start_time: '09:00', end_time: '10:00', service: 'Cardiac Consultation' },
  { provider_index: 6, date: Date.today + 4, start_time: '14:00', end_time: '15:00', service: 'EKG Interpretation' },
  
  # Dr. Amanda Foster appointments (Dermatology)
  { provider_index: 7, date: Date.today + 1, start_time: '10:00', end_time: '10:30', service: 'Skin Cancer Screening' },
  { provider_index: 7, date: Date.today + 2, start_time: '15:00', end_time: '16:00', service: 'Acne Treatment' },
  { provider_index: 7, date: Date.today + 6, start_time: '11:00', end_time: '12:00', service: 'Cosmetic Consultation' },
  
  # Dr. David Lee appointments (Psychiatry)
  { provider_index: 8, date: Date.today + 2, start_time: '10:00', end_time: '11:00', service: 'Medication Management' },
  { provider_index: 8, date: Date.today + 3, start_time: '14:00', end_time: '15:00', service: 'Initial Psychiatric Evaluation' },
  
  # Lisa Anderson appointments (Massage Therapy)
  { provider_index: 9, date: Date.today + 1, start_time: '13:00', end_time: '14:00', service: 'Deep Tissue Massage' },
  { provider_index: 9, date: Date.today + 3, start_time: '15:00', end_time: '16:00', service: 'Sports Massage' },
  { provider_index: 9, date: Date.today + 6, start_time: '11:00', end_time: '12:00', service: 'Relaxation Massage' },
  
  # Dr. Karen Williams appointments (Internal Medicine)
  { provider_index: 10, date: Date.today + 1, start_time: '09:00', end_time: '10:00', service: 'Complex Case Consultation' },
  { provider_index: 10, date: Date.today + 2, start_time: '14:00', end_time: '15:00', service: 'Diabetes Management' },
  
  # Carlos Ramirez appointments (Pilates)
  { provider_index: 11, date: Date.today + 1, start_time: '07:00', end_time: '08:00', service: 'Morning Pilates Class' },
  { provider_index: 11, date: Date.today + 3, start_time: '18:00', end_time: '19:00', service: 'Core Strengthening' },
  
  # Dr. Rachel Green appointments (Psychology)
  { provider_index: 12, date: Date.today + 1, start_time: '15:00', end_time: '16:00', service: 'EMDR Therapy Session' },
  { provider_index: 12, date: Date.today + 2, start_time: '11:00', end_time: '12:00', service: 'Trauma Processing' },
  
  # Alex Wu appointments (Acupuncture)
  { provider_index: 13, date: Date.today + 2, start_time: '11:00', end_time: '12:00', service: 'Pain Management Session' },
  { provider_index: 13, date: Date.today + 4, start_time: '16:00', end_time: '17:00', service: 'Stress Relief Treatment' },
  
  # Dr. Patricia Moore appointments (Urgent Care)
  { provider_index: 14, date: Date.today + 1, start_time: '10:00', end_time: '10:30', service: 'Minor Injury Treatment' },
  { provider_index: 14, date: Date.today + 1, start_time: '15:00', end_time: '15:30', service: 'Cold & Flu Visit' },
  { provider_index: 14, date: Date.today + 6, start_time: '11:00', end_time: '11:30', service: 'Urgent Care Consultation' }
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
puts "   Email: saintparish6@gmail.com"
puts "   Password: password123"
