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

export interface AuthFetchOptions extends RequestInit {
  /**
   * Opt out of the global 401 handler below.
   *
   * Set this on requests where a 401 is part of the endpoint's contract rather
   * than a sign that the session died: the login call (401 = wrong password),
   * and the session probe on mount (401 = the stored token is stale). Without
   * it, a wrong password would bounce the user to /login?reason=session_expired
   * instead of showing the real error, and a stale token would eject a visitor
   * from a public page.
   */
  skipSessionExpiredRedirect?: boolean;
}

// Shared authFetch helper to eliminate duplicated token/header boilerplate.
// Globally handles 401 responses: clears the stored token and redirects to
// /login with returnUrl + reason=session_expired so the login page can surface
// a contextual message to the user.
export async function authFetch(
  url: string,
  options: AuthFetchOptions = {}
): Promise<Response> {
  const { skipSessionExpiredRedirect, ...fetchOptions } = options;
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...toHeaderRecord(fetchOptions.headers),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;

  const response = await fetch(fullUrl, {
    ...fetchOptions,
    headers,
    credentials: fetchOptions.credentials || "include",
  });

  if (
    response.status === 401 &&
    !skipSessionExpiredRedirect &&
    typeof window !== "undefined"
  ) {
    removeToken();
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    // A hard navigation rather than router.push(): this module is plain
    // TypeScript with no router in scope, and a full reload is what we want here
    // anyway — it drops every in-memory copy of the expired session along with
    // the token.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
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
