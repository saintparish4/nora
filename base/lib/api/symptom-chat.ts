import { authFetch } from "./client";
import type { SymptomChatResponse } from "@/types";

/**
 * Send a user message to the conversational symptom chat API.
 *
 * The backend manages conversation state via `session_id`.
 * If the user is authenticated the conversation is automatically
 * bound to their account.
 */
export async function sendSymptomChatMessage(
  sessionId: string,
  message: string
): Promise<SymptomChatResponse> {
  const res = await authFetch("/api/v1/symptom-chat/send", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, message }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to send message");
  }

  return data;
}
