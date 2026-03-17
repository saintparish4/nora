/**
 * SWR preload helpers for common navigation paths.
 *
 * Call these on mouse-enter of sidebar links or at strategic points in the
 * booking wizard so data is in-cache by the time the user navigates there.
 * SWR deduplicates concurrent preloads automatically.
 */

import { preload } from 'swr';
import { getAppointments } from './appointments';
import { getProviders, getProvider } from './providers';

/** Preload the default (unfiltered, page 1) providers list. */
export function prefetchProviders(): void {
  preload(['providers', '', '', 1, 20], () => getProviders());
}

/** Preload the current user's appointments. */
export function prefetchAppointments(): void {
  preload('appointments', () => getAppointments());
}

/** Preload a single provider's profile by ID. */
export function prefetchProvider(id: number): void {
  preload(['provider', id], () => getProvider(id));
}
