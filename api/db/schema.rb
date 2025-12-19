# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_12_19_214604) do
  create_table "appointments", force: :cascade do |t|
    t.integer "patient_id", null: false
    t.integer "provider_id", null: false
    t.datetime "start_time", null: false
    t.datetime "end_time", null: false
    t.string "status", default: "pending", null: false
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["patient_id", "start_time"], name: "index_appointments_on_patient_id_and_start_time"
    t.index ["patient_id"], name: "index_appointments_on_patient_id"
    t.index ["provider_id", "start_time"], name: "index_appointments_on_provider_id_and_start_time"
    t.index ["provider_id"], name: "index_appointments_on_provider_id"
    t.index ["status"], name: "index_appointments_on_status"
  end

  create_table "availabilities", force: :cascade do |t|
    t.integer "provider_id", null: false
    t.integer "day_of_week", null: false
    t.time "start_time", null: false
    t.time "end_time", null: false
    t.boolean "is_available", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["provider_id", "day_of_week"], name: "index_availabilities_on_provider_id_and_day_of_week"
    t.index ["provider_id"], name: "index_availabilities_on_provider_id"
  end

  create_table "blocked_slots", force: :cascade do |t|
    t.integer "provider_id", null: false
    t.datetime "start_time", null: false
    t.datetime "end_time", null: false
    t.string "reason"
    t.string "source", default: "manual"
    t.string "external_event_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["external_event_id"], name: "index_blocked_slots_on_external_event_id"
    t.index ["provider_id", "start_time"], name: "index_blocked_slots_on_provider_id_and_start_time"
    t.index ["provider_id"], name: "index_blocked_slots_on_provider_id"
  end

  create_table "calendar_connections", force: :cascade do |t|
    t.integer "provider_id", null: false
    t.text "access_token"
    t.text "refresh_token"
    t.string "calendar_id"
    t.datetime "expires_at"
    t.datetime "last_synced_at"
    t.boolean "active", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["provider_id"], name: "index_calendar_connections_on_provider_id"
  end

  create_table "conversation_messages", force: :cascade do |t|
    t.integer "conversation_id", null: false
    t.string "role"
    t.text "content"
    t.json "metadata"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["conversation_id"], name: "index_conversation_messages_on_conversation_id"
  end

  create_table "conversations", force: :cascade do |t|
    t.integer "user_id", null: false
    t.string "session_id"
    t.string "status"
    t.json "context"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_conversations_on_user_id"
  end

  create_table "follow_up_recommendations", force: :cascade do |t|
    t.integer "user_id", null: false
    t.integer "appointment_id", null: false
    t.string "recommendation_type"
    t.text "message"
    t.datetime "scheduled_for"
    t.datetime "sent_at"
    t.boolean "acknowledged"
    t.json "metadata"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["appointment_id"], name: "index_follow_up_recommendations_on_appointment_id"
    t.index ["user_id"], name: "index_follow_up_recommendations_on_user_id"
  end

  create_table "provider_conditions", force: :cascade do |t|
    t.integer "provider_id", null: false
    t.string "condition_name"
    t.integer "expertise_level"
    t.integer "cases_treated"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["provider_id"], name: "index_provider_conditions_on_provider_id"
  end

  create_table "providers", force: :cascade do |t|
    t.string "name", null: false
    t.string "specialty", null: false
    t.text "bio"
    t.string "location"
    t.decimal "hourly_rate", precision: 8, scale: 2
    t.integer "experience_years"
    t.decimal "rating", precision: 3, scale: 2, default: "0.0"
    t.string "avatar_url"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["location"], name: "index_providers_on_location"
    t.index ["specialty"], name: "index_providers_on_specialty"
  end

  create_table "risk_assessments", force: :cascade do |t|
    t.integer "conversation_id", null: false
    t.integer "user_id", null: false
    t.string "care_level"
    t.integer "confidence"
    t.text "reasoning"
    t.json "red_flags"
    t.json "self_care_options"
    t.json "escalation_triggers"
    t.json "recommended_specialties"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["conversation_id"], name: "index_risk_assessments_on_conversation_id"
    t.index ["user_id"], name: "index_risk_assessments_on_user_id"
  end

  create_table "user_preferences", force: :cascade do |t|
    t.integer "user_id", null: false
    t.string "preferred_location"
    t.json "preferred_times"
    t.string "insurance_info"
    t.string "provider_gender_preference"
    t.json "language_preferences"
    t.json "communication_preferences"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_user_preferences_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email"
    t.string "password_digest"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.boolean "booking_confirmations", default: true
    t.boolean "reminders_24h", default: true
    t.boolean "cancellation_notices", default: true
    t.boolean "is_provider", default: false
    t.integer "provider_id"
    t.json "booking_patterns", default: {}
    t.json "health_history", default: {}
    t.index ["provider_id"], name: "index_users_on_provider_id"
  end

  add_foreign_key "appointments", "providers"
  add_foreign_key "appointments", "users", column: "patient_id"
  add_foreign_key "availabilities", "providers"
  add_foreign_key "blocked_slots", "providers"
  add_foreign_key "calendar_connections", "providers"
  add_foreign_key "conversation_messages", "conversations"
  add_foreign_key "conversations", "users"
  add_foreign_key "follow_up_recommendations", "appointments"
  add_foreign_key "follow_up_recommendations", "users"
  add_foreign_key "provider_conditions", "providers"
  add_foreign_key "risk_assessments", "conversations"
  add_foreign_key "risk_assessments", "users"
  add_foreign_key "user_preferences", "users"
end
