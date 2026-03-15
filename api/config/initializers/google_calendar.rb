require "google/apis/calendar_v3"
require "googleauth"
require "googleauth/stores/file_token_store"

GOOGLE_CLIENT_ID = ENV["GOOGLE_CLIENT_ID"]
GOOGLE_CLIENT_SECRET = ENV["GOOGLE_CLIENT_SECRET"]
GOOGLE_REDIRECT_URI = ENV["GOOGLE_REDIRECT_URI"] || "http://localhost:3001/api/v1/provider/calendar/callback"

GOOGLE_SCOPE = Google::Apis::CalendarV3::AUTH_CALENDAR_READONLY
