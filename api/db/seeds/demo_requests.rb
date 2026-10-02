# Prior authorization requests for the demo practice, one at each stage a
# visitor should see: decided by the payer, waiting on the clinician, blocked
# on missing documentation, and freshly read. The fifth patient has no request
# so there is one left to start.
#
# Each request is played through the real workflow services (Demo::Story), so
# nothing here writes a status, a quote, or an approval directly. Dates count
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

# 1. Everything documented. Approved, submitted, and approved by the payer.
Demo::Story.play(patient: patient.call("DEMO-1005"), item_name: "Wegovy", staff: staff, clinician: clinician,
                 starts_at: working_day.call(9, "09:10")) do |story|
  story.extract
  story.wait 4.minutes
  story.meet 1
  story.meet 2
  story.not_applicable 3, note: bmi_alone.call("38.1")
  story.meet 4
  story.meet 5
  story.meet 6
  story.meet 7

  story.at working_day.call(9, "15:42")
  story.approve
  story.at working_day.call(8, "08:50")
  story.move_to "submitted", payer_reference: "DEMO-PA-48291", prep_minutes_reported: 14
  story.at working_day.call(8, "16:30")
  story.move_to "payer_pending"
  story.at working_day.call(3, "11:20")
  story.move_to "approved_by_payer"
end

# 2. Two requirements the chart does not support. The payer's policy asks for a
# second prior medication trial, and the chart has only a phentermine fill with
# no outcome, which Nora does not offer as evidence. Nothing states whether she
# takes another GLP-1 either. Waiting on the clinician.
Demo::Story.play(patient: patient.call("DEMO-1001"), item_name: "Wegovy", staff: staff, clinician: clinician,
                 starts_at: [ working_day.call(0, "09:05"), 50.minutes.ago ].min) do |story|
  story.extract
  story.wait 7.minutes
  story.meet 1
  story.meet 2
  story.not_applicable 3, note: bmi_alone.call("34.2")
  story.meet 4
  story.meet 5
  story.missing 6, note: "The medication list shows no GLP-1, but the chart does not say she takes none. " \
                         "A list is not a statement."
  story.missing 7,
                   note: "Saxenda is the first trial (criterion 5). The pharmacy record shows one phentermine fill " \
                         "in 02/2025, with no documented response or reason for stopping. A fill alone does not " \
                         "document a second trial."
end

# 3. Every requirement verified by staff. Ready for the clinician to approve.
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

# 4. Just read. Excerpts are waiting for a person to verify them.
Demo::Story.play(patient: patient.call("DEMO-1002"), item_name: "Zepbound", staff: staff, clinician: clinician,
                 starts_at: [ working_day.call(0, "09:40"), 15.minutes.ago ].min, &:extract)

puts "Demo requests: #{org.prior_authorizations.group(:status).count.map { |status, n| "#{n} #{status}" }.join(', ')}."
