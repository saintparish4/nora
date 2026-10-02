import type { User } from '@/lib/api/schemas';

export type { User };

export interface AuthResponse {
  user: User;
  token?: string;
  message?: string;
  error?: string;
  errors?: string[];
}

/** Accounts a visitor can enter the demo practice as. */
export type DemoRole = 'staff' | 'clinician';

export interface DemoResponse {
  user: User;
  /** The request to open first, or null when the practice has none. */
  featured_prior_authorization_id: number | null;
}
