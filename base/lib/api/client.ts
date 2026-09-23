import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Authentication is the httpOnly `_nora_session` cookie and nothing else.
 *
 * The JWT that used to live in localStorage is gone. Anything JavaScript can
 * read, an XSS can steal, and a bearer token for a health record is the worst
 * thing to leave lying around in a place script can reach. The API now hands
 * bearer tokens only to clients that identify as non-browser
 * (`X-Client-Type: api`), which this one never does.
 *
 * The cost of a cookie the browser attaches automatically is CSRF, so mutating
 * requests carry a token the server hands out at GET /api/v1/auth/csrf. The
 * cookie proves who you are; the header proves you meant it.
 */
let csrfToken: string | null = null;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

export function clearCsrfToken(): void {
  csrfToken = null;
}

async function fetchCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/csrf`, {
      credentials: "include",
    });
    if (!res.ok) return null;

    const data = await res.json();
    csrfToken = data.csrf_token ?? null;
    return csrfToken;
  } catch {
    // A missing CSRF token is not worth blocking the request over — the server
    // is the one that decides, and it will answer 403 if it matters.
    return null;
  }
}

async function ensureCsrfToken(): Promise<string | null> {
  return csrfToken ?? (await fetchCsrfToken());
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
  const method = (fetchOptions.method ?? "GET").toUpperCase();
  const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;

  const send = async (csrf: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...toHeaderRecord(fetchOptions.headers),
    };
    if (csrf) headers["X-CSRF-Token"] = csrf;

    return fetch(fullUrl, {
      ...fetchOptions,
      headers,
      // The session cookie is the credential; it has to ride along.
      credentials: fetchOptions.credentials || "include",
    });
  };

  const needsCsrf = !SAFE_METHODS.has(method);
  let response = await send(needsCsrf ? await ensureCsrfToken() : null);

  // A cached token goes stale whenever the session is replaced — logging out
  // and back in, most obviously. Refetch once and retry before surfacing it.
  if (response.status === 403 && needsCsrf) {
    const body = await response.clone().json().catch(() => null);
    if (body?.code === "invalid_csrf_token") {
      clearCsrfToken();
      const fresh = await fetchCsrfToken();
      if (fresh) response = await send(fresh);
    }
  }

  if (
    response.status === 401 &&
    !skipSessionExpiredRedirect &&
    typeof window !== "undefined"
  ) {
    clearCsrfToken();
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
