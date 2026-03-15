require "sidekiq-scheduler"

Sidekiq.configure_server do |_config|
  schedule_file = Rails.root.join("config", "sidekiq_scheduler.yml")
  if File.exist?(schedule_file)
    raw_yaml = ERB.new(File.read(schedule_file)).result
    schedule = YAML.safe_load(raw_yaml, aliases: true)
    if schedule.present?
      Sidekiq.schedule = schedule
      Sidekiq::Scheduler.reload_schedule!
    end
  end
end
