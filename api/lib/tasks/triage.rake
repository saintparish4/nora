namespace :triage do
  desc "Print the triage concordance report (DAYS=30 to window it)"
  task concordance: :environment do
    days = ENV["DAYS"].presence&.to_i
    report = Triage::ConcordanceReportService.call(since: days&.days&.ago)

    puts JSON.pretty_generate(report)

    # The number that can end the company gets said out loud, not left in a
    # JSON blob for someone to notice.
    concordance = report[:concordance]
    if concordance[:available]
      rate = concordance[:under_triage_rate]
      puts
      puts "UNDER-TRIAGE RATE: #{(rate * 100).round(2)}% of #{concordance[:sample_size]} graded assessments"
      puts "Treat any movement here as a sev-1 incident, not a metric." if rate.to_f.positive?
    else
      puts
      puts "Concordance unavailable: #{concordance[:note]}"
    end
  end
end
