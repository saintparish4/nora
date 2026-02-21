class JsonWebToken
    SECRET_KEY = Rails.application.credentials.secret_key_base || ENV["SECRET_KEY_BASE"]

    raise "SECRET_KEY_BASE is not set. Configure Rails credentials or set the SECRET_KEY_BASE env var." if SECRET_KEY.blank?

    def self.encode(payload, exp = 24.hours.from_now)
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