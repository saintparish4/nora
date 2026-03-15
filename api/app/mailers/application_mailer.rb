class ApplicationMailer < ActionMailer::Base
  default from: ENV["RESEND_FROM_EMAIL"] || "Harmony Health <onboarding@resend.dev>"
  layout "mailer"
end
