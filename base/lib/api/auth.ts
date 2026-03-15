import { authFetch, setToken, removeToken, getToken, validateResponse } from "./client";
import { UserSchema } from "./schemas";
import type { AuthResponse, User } from "@/types";

export interface SignupFields {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  state?: string;
  phone?: string;
}

export async function signup(fields: SignupFields): Promise<AuthResponse> {
  const { email, password, first_name, last_name, state, phone } = fields;
  const res = await authFetch("/api/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      password_confirmation: password,
      first_name,
      last_name,
      state,
      phone,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.errors?.join(", ") || "Signup failed");
  }

  // Store token for future requests
  if (data.token) {
    setToken(data.token);
  }

  return data;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await authFetch("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Login failed");
  }

  // Store token for future requests
  if (data.token) {
    setToken(data.token);
  }

  return data;
}

export async function logout(): Promise<void> {
  const token = getToken();
  if (token) {
    await authFetch("/api/v1/auth/logout", {
      method: "DELETE",
    });
  }
  removeToken();
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const token = getToken();
    if (!token) {
      return null;
    }

    const res = await authFetch("/api/v1/auth/me");

    if (!res.ok) {
      // Token is invalid, remove it
      removeToken();
      return null;
    }

    const data = await res.json();
    return validateResponse(UserSchema, data.user);
  } catch {
    removeToken();
    return null;
  }
}

export async function updateEmailPreferences(preferences: {
  booking_confirmations?: boolean;
  reminders_24h?: boolean;
  cancellation_notices?: boolean;
}): Promise<{ message: string }> {
  const res = await authFetch("/api/v1/auth/update_preferences", {
    method: "PATCH",
    body: JSON.stringify(preferences),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to update preferences");
  }

  return data;
}
