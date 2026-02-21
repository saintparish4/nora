export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  state?: string;
  phone?: string;
  is_provider?: boolean;
  booking_confirmations?: boolean;
  reminders_24h?: boolean;
  cancellation_notices?: boolean;
}

export interface AuthResponse {
  user: User;
  token?: string;
  message?: string;
  error?: string;
  errors?: string[];
}
