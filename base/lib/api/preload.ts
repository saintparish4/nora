import { preload } from "swr";
import { eventsKey, patientKey, priorAuthorizationKey, tasksKey } from "./hooks";
import { getEvents, getPriorAuthorization } from "./prior-authorizations";
import { getMembers, getMetrics, getPatient, getTasks, getToday } from "./workspace";

/**
 * Start a screen's reads before the screen mounts, under the keys its hooks
 * use. SWR keeps preloaded requests outside any cache provider and hands each
 * one to the first hook that asks for that key, so the per-account cache in
 * AccountCache still starts empty and nothing is fetched twice.
 */

// A failed preload reaches the hook that picks it up, which reports it; it
// must not also surface as an unhandled rejection here.
const quiet = (request: Promise<unknown>) => void request.catch(() => {});

/** The prior authorization screen: the request, then everything that hangs off it. */
export function preloadRequest(id: number): void {
  const tasks = { prior_authorization_id: id, status: "open" };
  const request = preload(priorAuthorizationKey(id), () => getPriorAuthorization(id));
  quiet(request);
  quiet(preload(eventsKey(id), () => getEvents(id)));
  quiet(preload(tasksKey(tasks), () => getTasks(tasks)));
  quiet(preload("members", getMembers));
  // The patient's id is only known once the request arrives.
  quiet(request.then((pa) => preload(patientKey(pa.patient.id), () => getPatient(pa.patient.id))));
}

/** Today: the work queue and the metrics strip. */
export function preloadToday(): void {
  quiet(preload("today", getToday));
  quiet(preload("metrics", getMetrics));
}
