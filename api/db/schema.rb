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

ActiveRecord::Schema[8.1].define(version: 2026_09_30_000001) do
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

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email"
    t.integer "failed_login_attempts", default: 0, null: false
    t.string "first_name"
    t.string "last_name"
    t.datetime "locked_until"
    t.string "password_digest"
    t.string "phone"
    t.string "state"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "refresh_tokens", "refresh_tokens", column: "replaced_by_id"
  add_foreign_key "refresh_tokens", "users"
end
