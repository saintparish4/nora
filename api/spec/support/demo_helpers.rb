# frozen_string_literal: true

# Seeds the demo practice the way `rails db:seed` does, without the progress
# lines the seed files print.
module DemoSpecHelpers
  def seed_demo_practice
    silence_seed_output { Rails.application.load_seed }
    Demo::Practice.organization
  end

  def reset_demo_practice
    Demo::ResetService.call
    seed_demo_practice
  end

  def silence_seed_output
    original = $stdout
    $stdout = StringIO.new
    yield
  ensure
    $stdout = original
  end
end

RSpec.configure do |config|
  config.include DemoSpecHelpers
end
