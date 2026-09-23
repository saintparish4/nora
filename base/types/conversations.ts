import type {
  ConversationDetail,
  ConversationMessage,
  ConversationSummary,
  RiskAssessment,
} from '@/lib/api/schemas';

export type {
  ConversationDetail,
  ConversationMessage,
  ConversationSummary,
  RiskAssessment,
};

/** Care levels the triage analyzer can return, in escalation order. */
export const CARE_LEVELS = ['routine', 'urgent', 'emergency'] as const;
export type CareLevel = (typeof CARE_LEVELS)[number];
