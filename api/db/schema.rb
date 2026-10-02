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

ActiveRecord::Schema[8.1].define(version: 2026_10_01_000001) do
  create_table "approvals", force: :cascade do |t|
    t.integer "approvable_id", null: false
    t.string "approvable_type", null: false
    t.integer "approved_by_id", null: false
    t.string "content_digest", null: false
    t.datetime "created_at", null: false
    t.index ["approvable_type", "approvable_id"], name: "index_approvals_on_approvable"
    t.index ["approved_by_id"], name: "index_approvals_on_approved_by_id"
  end

  create_table "authorization_evidence", force: :cascade do |t|
    t.integer "authorization_requirement_id", null: false
    t.integer "chart_document_id", null: false
    t.decimal "confidence", precision: 4, scale: 3
    t.datetime "created_at", null: false
    t.integer "end_offset", null: false
    t.text "excerpt", null: false
    t.string "extracted_by", null: false
    t.text "rationale"
    t.datetime "rejected_at"
    t.integer "rejected_by_id"
    t.integer "start_offset", null: false
    t.datetime "updated_at", null: false
    t.datetime "verified_at"
    t.integer "verified_by_id"
    t.index ["authorization_requirement_id"], name: "index_authorization_evidence_on_authorization_requirement_id"
    t.index ["chart_document_id"], name: "index_authorization_evidence_on_chart_document_id"
    t.index ["rejected_by_id"], name: "index_authorization_evidence_on_rejected_by_id"
    t.index ["verified_by_id"], name: "index_authorization_evidence_on_verified_by_id"
  end

  create_table "authorization_requirements", force: :cascade do |t|
    t.text "ai_summary"
    t.datetime "created_at", null: false
    t.text "note"
    t.integer "policy_criterion_id", null: false
    t.integer "prior_authorization_id", null: false
    t.datetime "reviewed_at"
    t.integer "reviewed_by_id"
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.index ["policy_criterion_id"], name: "index_authorization_requirements_on_policy_criterion_id"
    t.index ["prior_authorization_id", "policy_criterion_id"], name: "index_auth_requirements_on_pa_and_criterion", unique: true
    t.index ["prior_authorization_id"], name: "index_authorization_requirements_on_prior_authorization_id"
    t.index ["reviewed_by_id"], name: "index_authorization_requirements_on_reviewed_by_id"
  end

  create_table "chart_documents", force: :cascade do |t|
    t.text "body", null: false
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "kind", null: false
    t.date "occurred_on"
    t.integer "organization_id", null: false
    t.string "original_filename"
    t.integer "patient_id", null: false
    t.string "source", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.integer "uploaded_by_id", null: false
    t.index ["organization_id"], name: "index_chart_documents_on_organization_id"
    t.index ["patient_id"], name: "index_chart_documents_on_patient_id"
    t.index ["uploaded_by_id"], name: "index_chart_documents_on_uploaded_by_id"
  end

  create_table "insurance_plans", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.integer "payer_id", null: false
    t.string "plan_type"
    t.datetime "updated_at", null: false
    t.index ["payer_id", "name"], name: "index_insurance_plans_on_payer_id_and_name", unique: true
    t.index ["payer_id"], name: "index_insurance_plans_on_payer_id"
  end

  create_table "organizations", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.boolean "demo", default: false, null: false
    t.string "name", null: false
    t.string "npi"
    t.string "timezone", default: "America/New_York", null: false
    t.datetime "updated_at", null: false
  end

  create_table "patient_coverages", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "effective_on"
    t.string "group_number"
    t.integer "insurance_plan_id", null: false
    t.string "member_id", null: false
    t.integer "patient_id", null: false
    t.boolean "primary", default: true, null: false
    t.datetime "updated_at", null: false
    t.index ["insurance_plan_id"], name: "index_patient_coverages_on_insurance_plan_id"
    t.index ["patient_id"], name: "index_patient_coverages_on_patient_id"
  end

  create_table "patients", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "date_of_birth", null: false
    t.string "first_name", null: false
    t.string "last_name", null: false
    t.string "mrn"
    t.integer "organization_id", null: false
    t.string "sex"
    t.datetime "updated_at", null: false
    t.index ["organization_id", "last_name", "first_name"], name: "index_patients_on_organization_id_and_last_name_and_first_name"
    t.index ["organization_id", "mrn"], name: "index_patients_on_organization_id_and_mrn", unique: true, where: "mrn IS NOT NULL"
    t.index ["organization_id"], name: "index_patients_on_organization_id"
  end

  create_table "payers", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.string "payer_code"
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_payers_on_name", unique: true
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

  create_table "policy_criteria", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.json "hint", default: {}, null: false
    t.string "kind", null: false
    t.boolean "optional", default: false, null: false
    t.integer "policy_template_id", null: false
    t.integer "position", null: false
    t.text "text", null: false
    t.datetime "updated_at", null: false
    t.index ["policy_template_id", "position"], name: "index_policy_criteria_on_policy_template_id_and_position", unique: true
    t.index ["policy_template_id"], name: "index_policy_criteria_on_policy_template_id"
  end

  create_table "policy_templates", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "effective_on"
    t.string "item_code"
    t.string "item_kind", null: false
    t.string "item_name", null: false
    t.text "notes"
    t.integer "payer_id"
    t.string "source_url"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.integer "version", default: 1, null: false
    t.index ["item_name", "payer_id", "version"], name: "index_policy_templates_on_item_name_and_payer_id_and_version", unique: true
    t.index ["payer_id"], name: "index_policy_templates_on_payer_id"
  end

  create_table "prior_authorizations", force: :cascade do |t|
    t.integer "assigned_to_id"
    t.datetime "created_at", null: false
    t.integer "created_by_id", null: false
    t.datetime "decided_at"
    t.datetime "extracted_at"
    t.string "extraction_error"
    t.string "extraction_status", default: "idle", null: false
    t.string "item_code"
    t.string "item_name", null: false
    t.integer "organization_id", null: false
    t.integer "patient_coverage_id", null: false
    t.integer "patient_id", null: false
    t.string "payer_reference"
    t.integer "policy_template_id", null: false
    t.integer "prep_minutes_reported"
    t.integer "requested_by_id", null: false
    t.string "status", default: "draft", null: false
    t.datetime "submitted_at"
    t.datetime "updated_at", null: false
    t.index ["assigned_to_id"], name: "index_prior_authorizations_on_assigned_to_id"
    t.index ["created_by_id"], name: "index_prior_authorizations_on_created_by_id"
    t.index ["organization_id", "status"], name: "index_prior_authorizations_on_organization_id_and_status"
    t.index ["organization_id"], name: "index_prior_authorizations_on_organization_id"
    t.index ["patient_coverage_id"], name: "index_prior_authorizations_on_patient_coverage_id"
    t.index ["patient_id"], name: "index_prior_authorizations_on_patient_id"
    t.index ["policy_template_id"], name: "index_prior_authorizations_on_policy_template_id"
    t.index ["requested_by_id"], name: "index_prior_authorizations_on_requested_by_id"
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

  create_table "tasks", force: :cascade do |t|
    t.integer "assignee_id"
    t.datetime "completed_at"
    t.datetime "created_at", null: false
    t.date "due_on"
    t.integer "organization_id", null: false
    t.integer "source_id"
    t.string "source_type"
    t.string "status", default: "open", null: false
    t.integer "subject_id", null: false
    t.string "subject_type", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["assignee_id"], name: "index_tasks_on_assignee_id"
    t.index ["organization_id", "status"], name: "index_tasks_on_organization_id_and_status"
    t.index ["organization_id"], name: "index_tasks_on_organization_id"
    t.index ["source_type", "source_id"], name: "index_tasks_on_source"
    t.index ["subject_type", "subject_id"], name: "index_tasks_on_subject"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email"
    t.integer "failed_login_attempts", default: 0, null: false
    t.string "first_name"
    t.string "last_name"
    t.datetime "locked_until"
    t.integer "organization_id", null: false
    t.string "password_digest"
    t.string "phone"
    t.string "role", default: "staff", null: false
    t.string "state"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["organization_id"], name: "index_users_on_organization_id"
  end

  create_table "workflow_events", force: :cascade do |t|
    t.integer "actor_id"
    t.datetime "created_at", null: false
    t.string "event_type", null: false
    t.string "from_status"
    t.integer "organization_id", null: false
    t.json "payload", default: {}, null: false
    t.integer "subject_id", null: false
    t.string "subject_type", null: false
    t.string "to_status"
    t.index ["actor_id"], name: "index_workflow_events_on_actor_id"
    t.index ["organization_id"], name: "index_workflow_events_on_organization_id"
    t.index ["subject_type", "subject_id", "created_at"], name: "idx_on_subject_type_subject_id_created_at_c6a21a9d6b"
    t.index ["subject_type", "subject_id"], name: "index_workflow_events_on_subject"
  end

  add_foreign_key "approvals", "users", column: "approved_by_id"
  add_foreign_key "authorization_evidence", "authorization_requirements"
  add_foreign_key "authorization_evidence", "chart_documents"
  add_foreign_key "authorization_evidence", "users", column: "rejected_by_id"
  add_foreign_key "authorization_evidence", "users", column: "verified_by_id"
  add_foreign_key "authorization_requirements", "policy_criteria"
  add_foreign_key "authorization_requirements", "prior_authorizations"
  add_foreign_key "authorization_requirements", "users", column: "reviewed_by_id"
  add_foreign_key "chart_documents", "organizations"
  add_foreign_key "chart_documents", "patients"
  add_foreign_key "chart_documents", "users", column: "uploaded_by_id"
  add_foreign_key "insurance_plans", "payers"
  add_foreign_key "patient_coverages", "insurance_plans"
  add_foreign_key "patient_coverages", "patients"
  add_foreign_key "patients", "organizations"
  add_foreign_key "policy_criteria", "policy_templates"
  add_foreign_key "policy_templates", "payers"
  add_foreign_key "prior_authorizations", "organizations"
  add_foreign_key "prior_authorizations", "patient_coverages"
  add_foreign_key "prior_authorizations", "patients"
  add_foreign_key "prior_authorizations", "policy_templates"
  add_foreign_key "prior_authorizations", "users", column: "assigned_to_id"
  add_foreign_key "prior_authorizations", "users", column: "created_by_id"
  add_foreign_key "prior_authorizations", "users", column: "requested_by_id"
  add_foreign_key "refresh_tokens", "refresh_tokens", column: "replaced_by_id"
  add_foreign_key "refresh_tokens", "users"
  add_foreign_key "tasks", "organizations"
  add_foreign_key "tasks", "users", column: "assignee_id"
  add_foreign_key "users", "organizations"
  add_foreign_key "workflow_events", "organizations"
  add_foreign_key "workflow_events", "users", column: "actor_id"
end
