namespace :demo do
  desc "Clear the demo practice and seed it again (needs DEMO_PRACTICE=true in production)"
  task reset: :environment do
    abort "The demo practice is off. Set DEMO_PRACTICE=true to use it in production." unless Demo::Practice.enabled?

    Demo::ResetService.call
    Rails.application.load_seed
  end
end
