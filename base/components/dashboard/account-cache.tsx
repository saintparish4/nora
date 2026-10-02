'use client';

import { SWRConfig } from 'swr';
import { useAuth } from '@/lib/auth/context';

/**
 * Gives each signed-in account its own SWR cache.
 *
 * Cache keys name a resource ("today", a request id), not who asked for it.
 * With one shared cache, signing out and in as someone else in the same tab
 * showed the previous account's records until the refetch landed. Keying the
 * provider on the user id mounts a fresh, empty cache whenever the account
 * changes.
 */
export function AccountCache({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <SWRConfig key={user?.id ?? 'signed-out'} value={{ provider: () => new Map() }}>
      {children}
    </SWRConfig>
  );
}
