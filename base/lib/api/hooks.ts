'use client';

import useSWR from 'swr';
import * as Sentry from '@sentry/nextjs';
import { getAppointments } from './appointments';
import { getProviders, getProvider, getAvailableSlots } from './providers';
import type { AppointmentsResponse, ProvidersResponse, Provider, AvailableSlotsResponse } from '@/types';

// Shared SWR config: no refetch on window focus (medical data doesn't change
// every time a user tabs back in), and dedupe rapid repeated calls.
const SWR_OPTIONS = {
  revalidateOnFocus: false,
  dedupingInterval: 10_000,
  onError: (error: Error) => {
    console.error('[SWR error]', error);
    Sentry.captureException(error);
  },
} as const;

export interface UseProvidersParams {
  specialty?: string;
  sort?: string;
  page?: number;
  per_page?: number;
}

/**
 * Fetches the current user's upcoming and past appointments.
 * Returns the SWR result including `mutate` so callers can trigger a revalidation
 * after mutations (e.g. cancelling or booking an appointment).
 */
export function useAppointments() {
  return useSWR<AppointmentsResponse>(
    'appointments',
    () => getAppointments(),
    SWR_OPTIONS
  );
}

/**
 * Fetches the paginated provider list with optional filters.
 * The key includes all filter params so SWR automatically refetches when they change.
 */
export function useProviders(params?: UseProvidersParams) {
  const key = [
    'providers',
    params?.specialty ?? '',
    params?.sort ?? '',
    params?.page ?? 1,
    params?.per_page ?? 20,
  ];

  return useSWR<ProvidersResponse>(
    key,
    () => getProviders(params),
    SWR_OPTIONS
  );
}

/**
 * Fetches a single provider by ID.
 * Passing `null` or `0` disables the request (useful for unresolved route params).
 */
export function useProvider(id: number | null) {
  return useSWR<Provider>(
    id ? ['provider', id] : null,
    () => getProvider(id as number),
    SWR_OPTIONS
  );
}

/**
 * Fetches available booking slots for a provider.
 * Kept separate from useProvider so slots can be revalidated after booking
 * without re-fetching provider profile data.
 */
export function useProviderSlots(id: number | null) {
  return useSWR<AvailableSlotsResponse>(
    id ? ['provider-slots', id] : null,
    () => getAvailableSlots(id as number),
    SWR_OPTIONS
  );
}
