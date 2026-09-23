import { authFetch, validateResponse } from "./client";
import {
  ConversationResponseSchema,
  ConversationsResponseSchema,
} from "./schemas";
import type { ConversationDetail, ConversationSummary } from "@/types";

/**
 * The signed-in patient's symptom-chat history, newest first.
 *
 * Only conversations bound to an account are returned — guest chats on the
 * public analyzer have no user to attach history to.
 */
export async function getConversations(): Promise<ConversationSummary[]> {
  const res = await authFetch("/api/v1/conversations");

  if (!res.ok) {
    throw new Error("Failed to fetch symptom check history");
  }

  const data = await res.json();
  return validateResponse(ConversationsResponseSchema, data).conversations;
}

/** One past conversation with its full transcript and risk assessments. */
export async function getConversation(id: number): Promise<ConversationDetail> {
  const res = await authFetch(`/api/v1/conversations/${id}`);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch symptom check");
  }

  const data = await res.json();
  return validateResponse(ConversationResponseSchema, data).conversation;
}
