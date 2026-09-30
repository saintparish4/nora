'use client';

import useSWR from 'swr';
import * as Sentry from '@sentry/nextjs';
import {
  getMembers,
  getOrganization,
  getPatient,
  getPatients,
  getPayers,
  getPolicyTemplates,
  getTasks,
  getToday,
} from './workspace';
import {
  getEvents,
  getPriorAuthorization,
  getPriorAuthorizations,
  type PriorAuthorizationFilters,
} from './prior-authorizations';

// Shared SWR config: no refetch on window focus (records don't change every
// time a user tabs back in), and dedupe rapid repeated calls.
export const SWR_OPTIONS = {
  revalidateOnFocus: false,
  dedupingInterval: 5_000,
  onError: (error: Error) => {
    console.error('[SWR error]', error);
    Sentry.captureException(error);
  },
} as const;

export function useToday() {
  return useSWR('today', getToday, SWR_OPTIONS);
}

export function useOrganization() {
  return useSWR('organization', getOrganization, SWR_OPTIONS);
}

export function useMembers() {
  return useSWR('members', getMembers, SWR_OPTIONS);
}

export function usePatients(params: { q?: string; page?: number }) {
  return useSWR(['patients', params.q ?? '', params.page ?? 1], () => getPatients(params), {
    ...SWR_OPTIONS,
    keepPreviousData: true,
  });
}

export function usePatient(id: number | null) {
  return useSWR(id ? ['patient', id] : null, () => getPatient(id as number), SWR_OPTIONS);
}

export function usePayers() {
  return useSWR('payers', getPayers, { ...SWR_OPTIONS, dedupingInterval: 60_000 });
}

export function usePolicyTemplates() {
  return useSWR('policy-templates', getPolicyTemplates, { ...SWR_OPTIONS, dedupingInterval: 60_000 });
}

export function usePriorAuthorizations(filters: PriorAuthorizationFilters) {
  return useSWR(['prior-authorizations', JSON.stringify(filters)], () => getPriorAuthorizations(filters), {
    ...SWR_OPTIONS,
    keepPreviousData: true,
  });
}

/** Polls every 2 seconds while evidence extraction is running. */
export function usePriorAuthorization(id: number | null) {
  return useSWR(id ? ['prior-authorization', id] : null, () => getPriorAuthorization(id as number), {
    ...SWR_OPTIONS,
    refreshInterval: (data) => (data?.extraction_status === 'running' ? 2_000 : 0),
  });
}

export function usePriorAuthorizationEvents(id: number | null, version?: string) {
  return useSWR(id ? ['prior-authorization-events', id, version ?? ''] : null, () => getEvents(id as number), SWR_OPTIONS);
}

export function useTasks(params: { status?: string; mine?: boolean; prior_authorization_id?: number }, version?: string) {
  return useSWR(
    ['tasks', params.status ?? '', params.mine ?? false, params.prior_authorization_id ?? 0, version ?? ''],
    () => getTasks(params),
    SWR_OPTIONS
  );
}
