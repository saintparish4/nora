import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitive / nested schemas (referenced by multiple top-level schemas)
// ---------------------------------------------------------------------------

export const AvailabilitySchema = z.object({
  id: z.number(),
  provider_id: z.number(),
  day_of_week: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  is_available: z.boolean(),
});

export const ProviderSchema = z.object({
  id: z.number(),
  name: z.string(),
  specialty: z.string(),
  bio: z.string(),
  location: z.string(),
  hourly_rate: z.number(),
  experience_years: z.number(),
  rating: z.number(),
  avatar_url: z.string(),
  availabilities: z.array(AvailabilitySchema).optional(),
  has_availability: z.boolean().optional(),
});

export const TimeSlotSchema = z.object({
  start_time: z.string(),
  end_time: z.string(),
  date: z.string(),
  time: z.string(),
});

// Alias used in the plan's naming convention
export const SlotSchema = TimeSlotSchema;

export const AvailableSlotsResponseSchema = z.object({
  provider_id: z.number(),
  slots: z.record(z.string(), z.array(TimeSlotSchema)),
  total_slots: z.number(),
});

export const AppointmentSchema = z.object({
  id: z.number(),
  patient_id: z.number(),
  provider_id: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  status: z.string(),
  notes: z.string().optional(),
  provider: ProviderSchema.optional(),
});

export const AppointmentsResponseSchema = z.object({
  upcoming: z.array(AppointmentSchema),
  past: z.array(AppointmentSchema),
});

export const ProvidersResponseSchema = z.object({
  providers: z.array(ProviderSchema),
  total: z.number(),
  page: z.number(),
  per_page: z.number(),
  total_pages: z.number(),
});

export const UserSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  is_provider: z.boolean().optional(),
  booking_confirmations: z.boolean().optional(),
  reminders_24h: z.boolean().optional(),
  cancellation_notices: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Symptom chat history
// ---------------------------------------------------------------------------

export const RiskAssessmentSchema = z.object({
  id: z.number(),
  care_level: z.string(),
  confidence: z.number().nullable(),
  reasoning: z.string().nullable(),
  created_at: z.string(),
  red_flags: z.array(z.string()),
  recommended_specialties: z.array(z.string()),
  self_care_options: z.array(z.string()),
  escalation_triggers: z.array(z.string()),
});

export const ConversationMessageSchema = z.object({
  id: z.number(),
  role: z.string(),
  content: z.string(),
  created_at: z.string(),
});

export const ConversationSummarySchema = z.object({
  id: z.number(),
  session_id: z.string(),
  status: z.string(),
  preview: z.string().nullable(),
  message_count: z.number(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
  latest_risk_assessment: RiskAssessmentSchema.nullable(),
});

export const ConversationsResponseSchema = z.object({
  conversations: z.array(ConversationSummarySchema),
});

export const ConversationDetailSchema = ConversationSummarySchema.extend({
  messages: z.array(ConversationMessageSchema),
  risk_assessments: z.array(RiskAssessmentSchema),
});

export const ConversationResponseSchema = z.object({
  conversation: ConversationDetailSchema,
});

// ---------------------------------------------------------------------------
// Care preferences
// ---------------------------------------------------------------------------

export const CarePreferencesSchema = z.object({
  preferred_location: z.string().nullable(),
  preferred_times: z.array(z.string()),
  insurance_info: z.string().nullable(),
  provider_gender_preference: z.string().nullable(),
  language_preferences: z.array(z.string()),
});

export const CarePreferencesResponseSchema = z.object({
  care_preferences: CarePreferencesSchema,
});

const UrgencyDetailsSchema = z.object({
  priority: z.number(),
  color: z.string(),
  message: z.string(),
});

export const SymptomAnalysisSchema = z.object({
  specialty: z.string(),
  urgency: z.string(),
  reasoning: z.string(),
  keywords: z.array(z.string()),
  red_flags: z.array(z.string()),
  specialty_name: z.string(),
  urgency_details: UrgencyDetailsSchema,
  // 0-100, or null when the model gave no usable number. Nullable rather than
  // defaulted: an invented confidence would corrupt the calibration curve the
  // backend reports on.
  confidence: z.number().int().min(0).max(100).nullable().optional(),
  // How the API arrived at this result:
  //   'red_flag_rules' — deterministic emergency screening, model not consulted
  //   'model'          — normal OpenAI analysis
  //   'fallback'       — the analysis did not run (see assessment_failed)
  // Optional so a cached or older response still parses; zod strips unknown
  // keys, so these have to be declared here to reach the UI at all.
  triage_source: z.enum(['red_flag_rules', 'model', 'fallback']).optional(),
  // True when the backend could not assess the symptoms and escalated as a
  // precaution. The UI must not present this as a recommendation.
  assessment_failed: z.boolean().optional(),
});

export const SymptomAnalysisResponseSchema = z.object({
  analysis: SymptomAnalysisSchema,
  timestamp: z.string(),
});

// ---------------------------------------------------------------------------
// Derived TypeScript types — use these instead of hand-written interfaces
// ---------------------------------------------------------------------------

export type User = z.infer<typeof UserSchema>;
export type Availability = z.infer<typeof AvailabilitySchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type TimeSlot = z.infer<typeof TimeSlotSchema>;
export type Slot = z.infer<typeof SlotSchema>;
export type AvailableSlotsResponse = z.infer<typeof AvailableSlotsResponseSchema>;
export type Appointment = z.infer<typeof AppointmentSchema>;
export type AppointmentsResponse = z.infer<typeof AppointmentsResponseSchema>;
export type ProvidersResponse = z.infer<typeof ProvidersResponseSchema>;
export type SymptomAnalysis = z.infer<typeof SymptomAnalysisSchema>;
export type SymptomAnalysisResponse = z.infer<typeof SymptomAnalysisResponseSchema>;
export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;
export type ConversationDetail = z.infer<typeof ConversationDetailSchema>;
export type ConversationsResponse = z.infer<typeof ConversationsResponseSchema>;
export type CarePreferences = z.infer<typeof CarePreferencesSchema>;
