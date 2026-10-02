# Seeds. Synthetic data only: nothing here may ever be real PHI.
#
# CI runs this file against PostgreSQL, so everything must stay idempotent and
# adapter-neutral.
#
#   db/seeds/policy_library.rb   payers, plans, and policy criteria (every env)
#   db/seeds/synthetic_charts.rb demo practice, staff, patients
#   db/seeds/demo_requests.rb    demo requests at four stages of the workflow
#
# The demo practice is seeded wherever Demo::Practice is enabled: everywhere
# but production, and in production only with DEMO_PRACTICE=true.
puts "Seeding database..."

load Rails.root.join("db/seeds/policy_library.rb")
if Demo::Practice.enabled?
  load Rails.root.join("db/seeds/synthetic_charts.rb")
  load Rails.root.join("db/seeds/demo_requests.rb")
end

puts "Seeding complete."
