# Seeds. Synthetic data only: nothing here may ever be real PHI.
#
# CI runs this file against PostgreSQL, so everything must stay idempotent and
# adapter-neutral.
#
#   db/seeds/policy_library.rb   payers, plans, and policy criteria (every env)
#   db/seeds/synthetic_charts.rb demo practice, staff, patients (not production)
puts "Seeding database..."

load Rails.root.join("db/seeds/policy_library.rb")
load Rails.root.join("db/seeds/synthetic_charts.rb") unless Rails.env.production?

puts "Seeding complete."
