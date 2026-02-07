import { Provider } from './providers';

export interface Availability {
  id: number;
  provider_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  date: string;
  time: string;
}

export interface AvailableSlotsResponse {
  provider_id: number;
  slots: Record<string, TimeSlot[]>; // grouped by date
  total_slots: number;
}

export interface Appointment {
  id: number;
  patient_id: number;
  provider_id: number;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  provider?: Provider;
}

export interface AppointmentsResponse {
  upcoming: Appointment[];
  past: Appointment[];
}
