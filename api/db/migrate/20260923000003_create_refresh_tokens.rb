# Refresh tokens for non-browser clients.
#
# Access tokens live 24 hours and cannot be revoked once issued, which is fine
# only because they are short. A refresh token is long-lived, so it is stored
# hashed, rotated on every use, and revocable — none of which was true of the
# JWT-in-localStorage arrangement this replaces.
class CreateRefreshTokens < ActiveRecord::Migration[8.1]
  def change
    create_table :refresh_tokens do |t|
      t.references :user, null: false, foreign_key: true

      # SHA-256 of the raw token. The raw value is returned to the client once
      # and never stored, so a database leak does not hand over live sessions.
      t.string :token_digest, null: false

      t.datetime :expires_at, null: false
      t.datetime :revoked_at

      # Rotation chain. Presence of a successor is what makes reuse of an old
      # token detectable.
      t.references :replaced_by, foreign_key: { to_table: :refresh_tokens }

      # Recorded so a user can be told which session was revoked and why.
      t.string :user_agent
      t.string :ip_address

      t.timestamps
    end

    add_index :refresh_tokens, :token_digest, unique: true
    add_index :refresh_tokens, [ :user_id, :revoked_at ]
  end
end
