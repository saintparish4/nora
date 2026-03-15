import type { Provider, ProvidersResponse } from '@/lib/api/schemas';

export type { Provider, ProvidersResponse };

export interface ProviderStats {
  total_appointments: number;
  this_week_appointments: number;
  completion_rate: number;
  average_duration: number;
  top_appointment_reasons: Array<{ reason: string; count: number }>;
}
