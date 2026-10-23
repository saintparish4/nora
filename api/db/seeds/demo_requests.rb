# Prior authorization requests for the demo practice, one at each stage a
# visitor should see: decided by the payer, ready to submit, blocked
# on missing documentation, and freshly read. Each is on a different payer, so
# the demo shows four published policies. The fifth patient has no request
# so there is one left to start.
#
# Each request is played through the real workflow services (Demo::Story), so
# nothing here writes a status, a quote, or a final check directly. Dates count
# back from today in working days, and the two open requests are from this
# morning so their follow-up tasks are not already overdue.
#
# Skipped when the practice already has requests. `bin/rails demo:reset`
# clears the practice and plays these again.

org = Demo::Practice.organization
if org.prior_authorizations.exists?
  puts "Demo requests: already present (bin/rails demo:reset rebuilds them)."
  return
end

staff = org.users.find_by!(email: Demo::Practice::ACCOUNTS.fetch("staff"))
clinician = org.users.find_by!(email: Demo::Practice::ACCOUNTS.fetch("clinician"))
patient = ->(mrn) { org.patients.find_by!(mrn: mrn) }

zone = ActiveSupport::TimeZone[org.timezone]
# `clock` on the working day `count` working days before today.
working_day = lambda do |count, clock|
  date = zone.today
  while count.positive?
    date -= 1
    count -= 1 unless date.on_weekend?
  end
  zone.parse("#{date} #{clock}")
end
bmi_alone = ->(bmi) { "BMI is #{bmi}, which meets the 30 threshold on its own, so a comorbidity is not required." }

# Positions follow each payer's criteria in db/seeds/policy_library.rb.

# 1. UnitedHealthcare: everything documented. Checked and submitted by staff
# under the prescriber's name, then approved by the payer.
Demo::Story.play(patient: patient.call("DEMO-1005"), item_name: "Wegovy", staff: staff, clinician: clinician,
                 starts_at: working_day.call(9, "09:10")) do |story|
  story.extract
  story.wait 4.minutes
  story.meet 1
  story.meet 2
  # The criterion is about how the drug will be used, not what she did before.
  story.meet 3, rejecting: [ "She has completed a 9-month" ]
  story.meet 4
  story.not_applicable 5, note: bmi_alone.call("38.1")

  story.at working_day.call(9, "09:31")
  story.submit payer_reference: "DEMO-PA-48291", prep_minutes_reported: 14
  story.at working_day.call(8, "16:30")
  story.move_to "payer_pending"
  story.at working_day.call(3, "11:20")
  story.move_to "approved_by_payer"
end

# 2. Cigna: two requirements the chart does not support. Cigna wants the BMI
# from before any GLP-1, and she took Saxenda in 2025; the only BMI on file
# is from after it. And nothing states that she takes no other GLP-1. Staff
# have tasks to find both; the baseline BMI has been asked of the prescriber's
# office, and nothing else waits on it.
Demo::Story.play(patient: patient.call("DEMO-1001"), item_name: "Wegovy", staff: staff, clinician: clinician,
                 starts_at: [ working_day.call(0, "09:05"), 50.minutes.ago ].min) do |story|
  story.extract
  story.wait 7.minutes
  story.meet 1
  story.meet 2
  story.missing 3, note: "Cigna asks for the BMI at baseline, before any GLP-1. She took Saxenda (a GLP-1) from 06/2025 to " \
                         "10/2025, and the only BMI on file (34.2, August 2026) is from after it. The reading from before " \
                         "June 2025 is needed."
  # Criterion 4 applies only if that baseline BMI was 27 to 29.9, so it waits.
  story.meet 5, rejecting: [ "She has followed a reduced-calorie diet" ]
  story.missing 6, note: "The medication list shows no GLP-1, but the chart does not say she takes none. " \
                         "A list is not a statement."
  story.wait 3.minutes
  story.ask_prescriber 3
end

# 3. BCBS Federal Employee Program: every requirement verified by staff.
# Ready for the staff member's final check and submission.
Demo::Story.play(patient: patient.call("DEMO-1004"), item_name: "Saxenda", staff: staff, clinician: clinician,
                 starts_at: working_day.call(1, "14:05")) do |story|
  story.extract
  story.wait 5.minutes
  story.meet 1
  story.meet 2
  story.not_applicable 3, note: bmi_alone.call("36.5")
  story.meet 4
  story.meet 5
  story.meet 6
end

# 4. Aetna: just read. Excerpts are waiting for a person to verify them.
Demo::Story.play(patient: patient.call("DEMO-1002"), item_name: "Zepbound", staff: staff, clinician: clinician,
                 starts_at: [ working_day.call(0, "09:40"), 15.minutes.ago ].min, &:extract)

puts "Demo requests: #{org.prior_authorizations.group(:status).count.map { |status, n| "#{n} #{status}" }.join(', ')}."
