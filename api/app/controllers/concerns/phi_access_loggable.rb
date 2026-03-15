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
    Sentry.capture_exception(e) if defined?(Sentry)
  end

  # Bulk-log PHI access for a collection of records in a single INSERT.
  #
  # Use this instead of calling log_phi_access in a loop (e.g. the
  # appointments index which may return dozens of records). insert_all
  # bypasses AR callbacks, which is intentional here — PhiAccessLog's
  # readonly! guard would fire on each instantiated record otherwise.
  #
  # @param resource_type  [String]         e.g. "Appointment"
  # @param resource_ids   [Array<#to_s>]   primary keys of accessed records
  # @param action         [String, Symbol] one of: view, create, update, delete
  # @param user_id        [Integer, nil]   override; defaults to current_user&.id
  def log_phi_access_batch(resource_type, resource_ids, action, user_id: current_user_id)
    return if resource_ids.blank?

    now        = Time.current
    sid        = guest_session_id
    rid        = request.request_id
    ip         = request.remote_ip
    action_str = action.to_s
    type_str   = resource_type.to_s

    records = resource_ids.map do |id|
      {
        user_id:       user_id,
        resource_type: type_str,
        resource_id:   id.to_s,
        action:        action_str,
        session_id:    sid,
        request_id:    rid,
        ip_address:    ip,
        created_at:    now,
        updated_at:    now
      }
    end

    PhiAccessLog.insert_all(records)
  rescue StandardError => e
    Rails.logger.error(
      "[PHI_AUDIT_FAILURE] batch resource=#{resource_type} " \
      "ids=#{resource_ids.inspect} action=#{action} " \
      "user=#{user_id} error=#{e.class}: #{e.message}"
    )
    Sentry.capture_exception(e) if defined?(Sentry)
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
