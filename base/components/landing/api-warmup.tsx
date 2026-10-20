'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PrefetchKind } from 'next/dist/client/components/router-reducer/router-reducer-types';
import { warmApi } from '@/lib/api/health';

/**
 * Starts the sleeping demo API booting while the visitor reads the landing
 * page, so the demo is usually awake by the time they click through. Also
 * fetches the code of the screen "Explore it yourself" lands on (any request
 * id: they all run the same code), which would otherwise download only after
 * the demo has signed in.
 */
export function ApiWarmup() {
  const router = useRouter();

  useEffect(() => {
    warmApi();
    router.prefetch('/dashboard/prior-authorizations/0', { kind: PrefetchKind.FULL });
  }, [router]);

  return null;
}
