Rails.application.routes.draw do
  # All API routes under /api/v1 namespace
  namespace :api do
    namespace :v1 do
      # Auth routes
      post "auth/signup", to: "auth#signup"
      post "auth/login", to: "auth#login"
      delete "auth/logout", to: "auth#logout"
      # Browser clients read this to prove a mutating request came from our own
      # page; the session cookie itself is httpOnly and unreadable.
      get "auth/csrf", to: "auth#csrf"
      # Non-browser clients exchange a rotating refresh token for a new access
      # token here. Browsers never receive either.
      post "auth/refresh", to: "auth#refresh"
      get "auth/me", to: "auth#me"
      patch "auth/profile", to: "auth#update_profile"
    end
  end
end
