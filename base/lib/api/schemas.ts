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
