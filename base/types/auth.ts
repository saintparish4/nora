import type { User } from '@/lib/api/schemas';

export type { User };

export interface AuthResponse {
  user: User;
  token?: string;
  message?: string;
  error?: string;
  errors?: string[];
}
