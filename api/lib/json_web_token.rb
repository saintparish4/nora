class JsonWebToken
    SECRET_KEY = Rails.application.credentials.secret_key_base || ENV["SECRET_KEY_BASE"]

    raise "SECRET_KEY_BASE is not set. Configure Rails credentials or set the SECRET_KEY_BASE env var." if SECRET_KEY.blank?

    # Short by design. An access token cannot be revoked once issued, so its
    # blast radius is bounded by how soon it expires; the refresh token is the
    # revocable half of the pair.
    ACCESS_TOKEN_TTL = 30.minutes

    def self.encode(payload, exp = ACCESS_TOKEN_TTL.from_now)
        payload[:exp] = exp.to_i
        JWT.encode(payload, SECRET_KEY)
    end

    def self.decode(token)
        body = JWT.decode(token, SECRET_KEY)[0]
        HashWithIndifferentAccess.new(body)
    rescue JWT::DecodeError
        nil
    end
end
