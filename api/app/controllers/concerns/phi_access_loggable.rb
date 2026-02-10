# frozen_string_literal: true

# Controller concern that provides a one-liner for PHI audit logging.
#
# Include in ApplicationController (or selectively in controllers that
# touch PHI) and call `log_phi_access` after each successful action.
#
# Usage:
#   log_phi_access("Appointment", @appointment.id, :view)
#   log_phi_access("Conversation", conversation.id, :create, user_id: nil)
#
# The helper is intentionally fire-and-forget: a failed audit INSERT must
# NOT break the user-facing request. We log the failure so ops can
# investigate, but the patient still gets their response.
#
# Why not use an around_action or after_action hook?
#   Because we need the resource_type and resource_id which are only known
#   inside each action. A blanket hook would either log too broadly (every
#   request) or require complex introspection to figure out what was accessed.
#   Explicit calls are boring but correct.
module PhiAccessLoggable
  extend ActiveSupport::Concern

  private

  # Log a PHI access event. Call this AFTER the action succeeds so we
  # record actual access, not attempted access.
  #
  # @param resource_type [String]  e.g. "Appointment", "Conversation"
  # @param resource_id   [#to_s]  primary key of the accessed record
  # @param action        [String, Symbol]  one of: view, create, update, delete
  # @param user_id       [Integer, nil]  override; defaults to current_user&.id
  def log_phi_access(resource_type, resource_id, action, user_id: current_user_id)
    PhiAccessLog.create!(
      user_id:       user_id,
      resource_type: resource_type.to_s,
      resource_id:   resource_id.to_s,
      action:        action.to_s,
      session_id:    guest_session_id,
      request_id:    request.request_id,
      ip_address:    request.remote_ip
    )
  rescue StandardError => e
    # Audit failure must not break the user-facing request, but we need
    # to know about it immediately — a gap in audit logs is a compliance risk.
    Rails.logger.error(
      "[PHI_AUDIT_FAILURE] " \
      "resource=#{resource_type}##{resource_id} action=#{action} " \
      "user=#{user_id} error=#{e.class}: #{e.message}"
    )
    # TODO: Send to error tracker (Sentry, Honeybadger, etc.) so this
    # doesn't silently rot in log files.
  end

  # Resolve the acting user's id. Returns nil for unauthenticated requests.
  # Override this if your auth setup uses a different method name.
  def current_user_id
    current_user&.id if respond_to?(:current_user, true)
  end

  # Best-effort session identifier for unauthenticated flows. Falls back to
  # request_id if no session exists (e.g. stateless API calls).
  #
  # NOTE: Adjust this if your app uses a custom session/token strategy
  # for guest users (e.g. a `guest_token` cookie or header).
  def guest_session_id
    session&.id&.to_s || request.request_id
  rescue StandardError
    nil
  end
end
