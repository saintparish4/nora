# Development seeds. Synthetic data only: nothing here may ever be real PHI.
#
# CI runs this file against PostgreSQL, so it must stay idempotent and
# adapter-neutral.
puts "Seeding database..."

demo = User.find_or_initialize_by(email: "demo@nora.com")
demo.assign_attributes(
  password: "password123",
  password_confirmation: "password123",
  first_name: "Demo",
  last_name: "User"
)
demo.save!

puts "Demo login: demo@nora.com / password123"
puts "Seeding complete."
