# Complements the Rack::Attack throttle in config/initializers/rack_attack.rb.
# That limits requests per IP; this limits failed attempts per account, which is
# what stops a distributed guessing attack on one patient's credentials.
class AddLoginLockoutToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :failed_login_attempts, :integer, default: 0, null: false
    add_column :users, :locked_until, :datetime
  end
end
