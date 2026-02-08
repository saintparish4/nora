import type { SymptomAnalysis } from './symptoms';
import type { Provider } from './providers';
import type { TimeSlot } from './appointments';

/** A provider with their next available time slots, returned by the chat API. */
export interface ChatProvider extends Provider {
  next_available_slots: TimeSlot[];
}

/** Response shape from POST /api/v1/symptom-chat/send */
export interface SymptomChatResponse {
  session_id: string;
  assistant_message: string;
  need_more_detail: boolean;
  analysis: SymptomAnalysis | null;
  providers: ChatProvider[] | null;
}
