import { API_URL, primeCsrfToken } from "./client";

/**
 * The API's free Render instance sleeps when idle and takes up to a minute to
 * boot. Render holds a request open while it does, so a single probe can hang
 * for most of that minute; we give each probe a few seconds and send another,
 * which lets the demo page report progress instead of sitting silent.
 */
const ATTEMPT_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 1500;
const GIVE_UP_AFTER_MS = 120_000;

/** When the API last answered a probe in this tab (0: not yet). */
let answeredAt = 0;

/** Milliseconds since the API last answered, or null if it has not in this tab. */
export function apiAnsweredAgo(): number | null {
  return answeredAt ? Date.now() - answeredAt : null;
}

export type ProbeResult =
  | { ok: true; status: number }
  | { ok: false; status?: number; timedOut: boolean };

/**
 * One GET /up: Rails' health check, which answers 200 once the app has booted
 * and touches no database. No cookie, so it says nothing about who is asking.
 */
export async function probeApi(timeoutMs = ATTEMPT_TIMEOUT_MS, signal?: AbortSignal): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const forward = () => controller.abort();
  signal?.addEventListener("abort", forward);
  try {
    const res = await fetch(`${API_URL}/up`, { cache: "no-store", signal: controller.signal });
    // A status we can read at all came from Rails: Render's own waking page
    // carries no CORS headers and surfaces as a TypeError below. So a 404 from
    // an API that predates the route still means it is up; a 5xx does not.
    if (res.status >= 500) return { ok: false, status: res.status, timedOut: false };
    answeredAt = Date.now();
    return { ok: true, status: res.status };
  } catch {
    // A TypeError (unreachable, or Render's own waking page without CORS
    // headers) and our own abort both mean the API is not answering yet.
    return { ok: false, timedOut: controller.signal.aborted && !signal?.aborted };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forward);
  }
}

export interface WakeAttempt {
  attempt: number;
  result: ProbeResult;
  /** Milliseconds since waking began. */
  elapsedMs: number;
}

export interface WakeOptions {
  signal?: AbortSignal;
  onAttempt?: (attempt: WakeAttempt) => void;
  attemptTimeoutMs?: number;
  retryDelayMs?: number;
  giveUpAfterMs?: number;
}

/**
 * Probe until the API answers. Resolves with the total wait in milliseconds;
 * rejects with a TypeError, as fetch does, if it never answers, and with an
 * AbortError if the caller stops waiting.
 */
export async function wakeApi({
  signal,
  onAttempt,
  attemptTimeoutMs = ATTEMPT_TIMEOUT_MS,
  retryDelayMs = RETRY_DELAY_MS,
  giveUpAfterMs = GIVE_UP_AFTER_MS,
}: WakeOptions = {}): Promise<number> {
  const started = Date.now();
  for (let attempt = 1; ; attempt++) {
    const result = await probeApi(attemptTimeoutMs, signal);
    if (signal?.aborted) throw new DOMException("Stopped waiting for the API", "AbortError");
    const elapsedMs = Date.now() - started;
    onAttempt?.({ attempt, result, elapsedMs });
    if (result.ok) return elapsedMs;
    if (elapsedMs >= giveUpAfterMs) throw new TypeError("The API did not answer");
    // A timed-out probe has already waited; only a quick failure needs a pause.
    if (!result.timedOut) await new Promise(resolve => setTimeout(resolve, retryDelayMs));
  }
}

/**
 * Fire-and-forget: start the API booting before anyone asks it for anything,
 * and once it answers, fetch the CSRF token the demo's sign-in will need.
 */
export function warmApi(): void {
  void probeApi(GIVE_UP_AFTER_MS).then(result => {
    if (result.ok) primeCsrfToken();
  });
}
