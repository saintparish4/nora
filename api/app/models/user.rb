class User < ApplicationRecord
    has_secure_password
    has_many :appointments, foreign_key: "patient_id", dependent: :destroy
    has_one :user_preference, dependent: :destroy
    has_many :conversations, dependent: :nullify
    has_many :risk_assessments, dependent: :destroy

    validates :email, presence: true, uniqueness: true
    validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }
    validates :password, length: { minimum: 6 }, if: -> { new_record? || password.present? }
    validates :phone, format: { with: /\A\d{10}\z/, message: "must be 10 digits" }, allow_blank: true

    before_save { self.email = email.downcase }

    # --- Login lockout -------------------------------------------------------
    # Rack::Attack throttles auth requests per IP. This throttles failed
    # attempts per *account*, which is the axis a distributed guessing attack
    # moves along. Deliberately short: long lockouts turn into a denial of
    # service against the real patient.
    MAX_FAILED_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION = 15.minutes

    def locked?
        locked_until.present? && locked_until > Time.current
    end

    # Seconds until the lock lifts, rounded up. 0 when not locked.
    def lockout_seconds_remaining
        return 0 unless locked?

        (locked_until - Time.current).ceil
    end

    def register_failed_login!
        attempts = failed_login_attempts + 1

        if attempts >= MAX_FAILED_LOGIN_ATTEMPTS
            update_columns(failed_login_attempts: attempts, locked_until: LOCKOUT_DURATION.from_now)
        else
            update_columns(failed_login_attempts: attempts)
        end
    end

    def register_successful_login!
        return if failed_login_attempts.zero? && locked_until.nil?

        update_columns(failed_login_attempts: 0, locked_until: nil)
    end
end
