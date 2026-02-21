class User < ApplicationRecord
    has_secure_password
    has_many :appointments, foreign_key: 'patient_id', dependent: :destroy
    has_one :user_preference, dependent: :destroy

    validates :email, presence: true, uniqueness: true
    validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }
    validates :password, length: { minimum: 6 }, if: -> { new_record? || password.present? }
    validates :phone, format: { with: /\A\d{10}\z/, message: 'must be 10 digits' }, allow_blank: true

    before_save { self.email = email.downcase }
end
