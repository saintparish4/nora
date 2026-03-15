import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const TOKEN_KEY = "nora_auth_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

// Normalize RequestInit.headers into a plain record so we can add Authorization.
function toHeaderRecord(init: HeadersInit | undefined): Record<string, string> {
  if (!init) return {};
  if (init instanceof Headers) return Object.fromEntries(init.entries());
  if (Array.isArray(init)) return Object.fromEntries(init as [string, string][]);
  return { ...init };
}

// Shared authFetch helper to eliminate duplicated token/header boilerplate.
// Globally handles 401 responses: clears the stored token and redirects to
// /login with returnUrl + reason=session_expired so the login page can surface
// a contextual message to the user.
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...toHeaderRecord(options.headers),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: options.credentials || "include",
  });

  if (response.status === 401 && typeof window !== "undefined") {
    removeToken();
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?returnUrl=${returnUrl}&reason=session_expired`;
    // Throw so callers don't attempt to process the unauthenticated response.
    throw new Error("Session expired");
  }

  return response;
}

/**
 * Validates API response data against a Zod schema.
 *
 * - Development: `schema.parse(data)` — throws immediately on any mismatch,
 *   surfacing backend contract breaks as early as possible.
 * - Production: `schema.safeParse(data)` — logs failures to Sentry and returns
 *   the raw data anyway so the UI degrades gracefully rather than crashing.
 */
export function validateResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  if (process.env.NODE_ENV === "development") {
    return schema.parse(data);
  }

  const result = schema.safeParse(data);
  if (!result.success) {
    Sentry.captureException(
      new Error("API response validation failed"),
      { extra: { issues: result.error.issues } }
    );
    // Resilient fallback: return raw data so the UI doesn't crash on schema drift.
    return data as T;
  }
  return result.data;
}

export { API_URL };
