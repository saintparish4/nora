Rails.application.routes.draw do
  # All API routes under /api/v1 namespace
  namespace :api do
    namespace :v1 do
      # Auth routes
      post "auth/signup", to: "auth#signup"
      post "auth/login", to: "auth#login"
      delete "auth/logout", to: "auth#logout"
      get "auth/me", to: "auth#me"
      patch "auth/update_preferences", to: "auth#update_preferences"

      # Providers routes
      resources :providers, only: [ :index, :show ] do
        member do
          get "available_slots", to: "slots#available_slots"
        end
      end

      # Appointments routes
      resources :appointments, only: [ :index, :show, :create ] do
        member do
          patch :cancel
        end
      end

      # Quick booking routes (streamlined flow)
      post "/quick-booking/analyze", to: "quick_booking#analyze"
      post "/quick-booking/book", to: "quick_booking#book"

      # Symptoms analysis
      post "/analyze-symptoms", to: "symptoms#analyze"

      # Conversational symptom chat (guest-friendly)
      post "/symptom-chat/send", to: "symptom_chat#send_message"
    end
  end
end
