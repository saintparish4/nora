# A long-lived, revocable credential for non-browser clients.
#
# Three properties matter, and the old JWT-only arrangement had none of them:
#
# 1. **Stored hashed.** Only the SHA-256 digest is persisted, so a database
#    leak does not hand an attacker live sessions.
# 2. **Rotated on every use.** Each refresh burns the presented token and
#    issues a new one, so a stolen token is useful for one call at most.
# 3. **Reuse is detectable.** Presenting an already-rotated token means either
#    the attacker or the legitimate client is replaying — and there is no way
#    to tell which. The safe response is to revoke every token the user has and
#    make them sign in again.
class RefreshToken < ApplicationRecord
  LIFETIME = 30.days

  belongs_to :user
  belongs_to :replaced_by, class_name: "RefreshToken", optional: true

  validates :token_digest, presence: true, uniqueness: true
  validates :expires_at, presence: true

  scope :active, -> { where(revoked_at: nil).where(expires_at: Time.current..) }

  # @return [Array(String, RefreshToken)] the raw token (shown once, never
  #   stored) and the record.
  def self.issue!(user:, user_agent: nil, ip_address: nil)
    raw = SecureRandom.urlsafe_base64(48)

    record = create!(
      user: user,
      token_digest: digest(raw),
      expires_at: LIFETIME.from_now,
      user_agent: user_agent.to_s.first(255).presence,
      ip_address: ip_address.to_s.first(45).presence
    )

    [ raw, record ]
  end

  def self.digest(raw)
    OpenSSL::Digest::SHA256.hexdigest(raw.to_s)
  end

  def self.find_by_raw(raw)
    return nil if raw.blank?

    find_by(token_digest: digest(raw))
  end

  def active?
    revoked_at.nil? && expires_at.present? && expires_at.future?
  end

  def revoke!(at: Time.current)
    return true if revoked_at.present?

    update!(revoked_at: at)
  end

  # Presenting a token that has already been rotated means it leaked, or the
  # client is replaying. We cannot tell which, so every session goes.
  def self.revoke_all_for!(user, reason:)
    count = active.where(user: user).update_all(revoked_at: Time.current)
    Rails.logger.warn("[REFRESH_TOKEN_REVOKE_ALL] user=#{user.id} revoked=#{count} reason=#{reason}")
    count
  end

  # Burn this token and hand back a fresh one, linked so the chain stays
  # walkable.
  def rotate!(user_agent: nil, ip_address: nil)
    raw, successor = self.class.issue!(
      user: user,
      user_agent: user_agent,
      ip_address: ip_address
    )

    update!(revoked_at: Time.current, replaced_by: successor)

    [ raw, successor ]
  end
end
