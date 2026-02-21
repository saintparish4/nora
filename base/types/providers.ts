import { Availability } from './appointments';

export interface Provider {
  id: number;
  name: string;
  specialty: string;
  bio: string;
  location: string;
  hourly_rate: number;
  experience_years: number;
  rating: number;
  avatar_url: string;
  availabilities?: Availability[];
  /** Returned by the list endpoint instead of full availabilities */
  has_availability?: boolean;
}

export interface ProvidersResponse {
  providers: Provider[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ProviderStats {
  total_appointments: number;
  this_week_appointments: number;
  completion_rate: number;
  average_duration: number;
  top_appointment_reasons: Array<{ reason: string; count: number }>;
}
