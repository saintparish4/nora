import { authFetch, setToken, removeToken, getToken } from "./client";
import type { AuthResponse, User } from "@/types";

export async function signup(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await authFetch("/api/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      password_confirmation: password,
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
    return data.user;
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
