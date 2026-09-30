'use client';

import * as Sentry from '@sentry/nextjs';

// Shared SWR config: no refetch on window focus (records don't change every
// time a user tabs back in), and dedupe rapid repeated calls.
export const SWR_OPTIONS = {
  revalidateOnFocus: false,
  dedupingInterval: 10_000,
  onError: (error: Error) => {
    console.error('[SWR error]', error);
    Sentry.captureException(error);
  },
} as const;
