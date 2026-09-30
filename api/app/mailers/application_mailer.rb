class ApplicationMailer < ActionMailer::Base
  default from: ENV["RESEND_FROM_EMAIL"] || "Nora <onboarding@resend.dev>"
  layout "mailer"
end
