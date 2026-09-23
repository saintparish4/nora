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

ActiveRecord::Schema[8.1].define(version: 2026_09_23_000003) do
  create_table "appointments", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "end_time", null: false
    t.text "notes"
    t.integer "patient_id", null: false
    t.integer "provider_id", null: false
    t.datetime "start_time", null: false
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.index ["patient_id", "start_time"], name: "index_appointments_on_patient_id_and_start_time"
    t.index ["patient_id"], name: "index_appointments_on_patient_id"
    t.index ["provider_id", "start_time"], name: "index_appointments_on_provider_id_and_start_time"
    t.index ["provider_id"], name: "index_appointments_on_provider_id"
    t.index ["status"], name: "index_appointments_on_status"
  end

  create_table "availabilities", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "day_of_week", null: false
    t.time "end_time", null: false
    t.boolean "is_available", default: true
    t.integer "provider_id", null: false
    t.time "start_time", null: false
    t.datetime "updated_at", null: false
    t.index ["provider_id", "day_of_week"], name: "index_availabilities_on_provider_id_and_day_of_week"
    t.index ["provider_id"], name: "index_availabilities_on_provider_id"
  end

  create_table "blocked_slots", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "end_time", null: false
    t.string "external_event_id"
    t.integer "provider_id", null: false
    t.string "reason"
    t.string "source", default: "manual"
    t.datetime "start_time", null: false
    t.datetime "updated_at", null: false
    t.index ["external_event_id"], name: "index_blocked_slots_on_external_event_id"
    t.index ["provider_id", "start_time"], name: "index_blocked_slots_on_provider_id_and_start_time"
    t.index ["provider_id"], name: "index_blocked_slots_on_provider_id"
  end

  create_table "calendar_connections", force: :cascade do |t|
    t.text "access_token"
    t.boolean "active", default: true
    t.string "calendar_id"
    t.datetime "created_at", null: false
    t.datetime "expires_at"
    t.datetime "last_synced_at"
    t.integer "provider_id", null: false
    t.text "refresh_token"
    t.datetime "updated_at", null: false
    t.index ["provider_id"], name: "index_calendar_connections_on_provider_id"
  end

  create_table "conversation_messages", force: :cascade do |t|
    t.text "content"
    t.integer "conversation_id", null: false
    t.datetime "created_at", null: false
    t.json "metadata", default: {}
    t.string "role"
    t.datetime "updated_at", null: false
    t.index ["conversation_id", "created_at"], name: "index_conversation_messages_on_conversation_id_and_created_at"
    t.index ["conversation_id"], name: "index_conversation_messages_on_conversation_id"
  end

  create_table "conversations", force: :cascade do |t|
    t.datetime "completed_at"
    t.json "context", default: {}
    t.datetime "created_at", null: false
    t.string "session_id"
    t.string "status", default: "active"
    t.datetime "updated_at", null: false
    t.integer "user_id"
    t.index ["session_id"], name: "index_conversations_on_session_id"
    t.index ["status"], name: "index_conversations_on_status"
    t.index ["user_id"], name: "index_conversations_on_user_id"
  end

  create_table "follow_up_recommendations", force: :cascade do |t|
    t.boolean "acknowledged", default: false
    t.integer "appointment_id", null: false
    t.datetime "created_at", null: false
    t.text "message"
    t.json "metadata", default: {}
    t.string "recommendation_type"
    t.datetime "scheduled_for"
    t.datetime "sent_at"
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["appointment_id"], name: "index_follow_up_recommendations_on_appointment_id"
    t.index ["recommendation_type"], name: "index_follow_up_recommendations_on_recommendation_type"
    t.index ["user_id", "scheduled_for"], name: "index_follow_up_recommendations_on_user_id_and_scheduled_for"
    t.index ["user_id"], name: "index_follow_up_recommendations_on_user_id"
  end

  create_table "phi_access_logs", force: :cascade do |t|
    t.string "action", null: false
    t.datetime "created_at", null: false
    t.string "ip_address"
    t.string "request_id"
    t.string "resource_id", null: false
    t.string "resource_type", null: false
    t.string "session_id"
    t.bigint "user_id"
    t.index ["created_at"], name: "index_phi_access_logs_on_created_at"
    t.index ["resource_type", "resource_id"], name: "index_phi_access_logs_on_resource_type_and_resource_id"
    t.index ["user_id"], name: "index_phi_access_logs_on_user_id"
  end

  create_table "provider_conditions", force: :cascade do |t|
    t.integer "cases_treated", default: 0
    t.string "condition_name"
    t.datetime "created_at", null: false
    t.integer "expertise_level"
    t.integer "provider_id", null: false
    t.datetime "updated_at", null: false
    t.index ["provider_id", "condition_name"], name: "index_provider_conditions_on_provider_id_and_condition_name"
    t.index ["provider_id"], name: "index_provider_conditions_on_provider_id"
  end

  create_table "providers", force: :cascade do |t|
    t.string "avatar_url"
    t.text "bio"
    t.datetime "created_at", null: false
    t.integer "experience_years"
    t.decimal "hourly_rate", precision: 8, scale: 2
    t.string "location"
    t.string "name", null: false
    t.decimal "rating", precision: 3, scale: 2, default: "0.0"
    t.string "specialty", null: false
    t.datetime "updated_at", null: false
    t.index ["location"], name: "index_providers_on_location"
    t.index ["specialty"], name: "index_providers_on_specialty"
  end

  create_table "refresh_tokens", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "ip_address"
    t.integer "replaced_by_id"
    t.datetime "revoked_at"
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.string "user_agent"
    t.integer "user_id", null: false
    t.index ["replaced_by_id"], name: "index_refresh_tokens_on_replaced_by_id"
    t.index ["token_digest"], name: "index_refresh_tokens_on_token_digest", unique: true
    t.index ["user_id", "revoked_at"], name: "index_refresh_tokens_on_user_id_and_revoked_at"
    t.index ["user_id"], name: "index_refresh_tokens_on_user_id"
  end

  create_table "risk_assessments", force: :cascade do |t|
    t.string "actual_care_level"
    t.integer "appointment_id"
    t.string "care_level"
    t.integer "confidence"
    t.integer "conversation_id"
    t.datetime "created_at", null: false
    t.json "escalation_triggers", default: []
    t.string "outcome"
    t.datetime "outcome_recorded_at"
    t.text "reasoning"
    t.json "recommended_specialties", default: []
    t.json "red_flags", default: []
    t.json "self_care_options", default: []
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["actual_care_level"], name: "index_risk_assessments_on_actual_care_level"
    t.index ["appointment_id"], name: "index_risk_assessments_on_appointment_id"
    t.index ["care_level"], name: "index_risk_assessments_on_care_level"
    t.index ["conversation_id"], name: "index_risk_assessments_on_conversation_id"
    t.index ["outcome"], name: "index_risk_assessments_on_outcome"
    t.index ["user_id"], name: "index_risk_assessments_on_user_id"
  end

  create_table "user_preferences", force: :cascade do |t|
    t.json "communication_preferences", default: {}
    t.datetime "created_at", null: false
    t.string "insurance_info"
    t.json "language_preferences", default: []
    t.string "preferred_location"
    t.json "preferred_times", default: []
    t.string "provider_gender_preference"
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["user_id"], name: "index_user_preferences_on_user_id", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.boolean "booking_confirmations", default: true
    t.json "booking_patterns", default: {}
    t.boolean "cancellation_notices", default: true
    t.datetime "created_at", null: false
    t.string "email"
    t.integer "failed_login_attempts", default: 0, null: false
    t.string "first_name"
    t.json "health_history", default: {}
    t.boolean "is_provider", default: false
    t.string "last_name"
    t.datetime "locked_until"
    t.string "password_digest"
    t.string "phone"
    t.integer "provider_id"
    t.boolean "reminders_24h", default: true
    t.string "state"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["provider_id"], name: "index_users_on_provider_id"
  end

  add_foreign_key "appointments", "providers"
  add_foreign_key "appointments", "users", column: "patient_id"
  add_foreign_key "availabilities", "providers"
  add_foreign_key "blocked_slots", "providers"
  add_foreign_key "calendar_connections", "providers"
  add_foreign_key "conversation_messages", "conversations"
  add_foreign_key "conversations", "users", on_delete: :nullify
  add_foreign_key "follow_up_recommendations", "appointments"
  add_foreign_key "follow_up_recommendations", "users"
  add_foreign_key "provider_conditions", "providers"
  add_foreign_key "refresh_tokens", "refresh_tokens", column: "replaced_by_id"
  add_foreign_key "refresh_tokens", "users"
  add_foreign_key "risk_assessments", "appointments"
  add_foreign_key "risk_assessments", "conversations"
  add_foreign_key "risk_assessments", "users"
  add_foreign_key "user_preferences", "users"
end
