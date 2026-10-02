'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';

const ROLE_LABELS = { staff: 'medical assistant', clinician: 'clinician', admin: 'admin' } as const;

/**
 * Shown across the workspace while signed in to the shared demo practice:
 * says who the visitor is and that the data is synthetic and shared, and
 * offers the other persona, since only the clinician can approve a packet.
 */
export function DemoBanner() {
  const { user } = useAuth();
  if (!user?.organization?.demo) return null;

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
  const other = user.role === 'clinician' ? 'staff' : 'clinician';

  return (
    <aside
      aria-label="Demo practice"
      className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
    >
      <p>
        <span className="font-medium">Demo practice.</span> You are {name}{user.role ? `, the ${ROLE_LABELS[user.role]}` : ''}.
        The data is synthetic and shared with other visitors, so don&apos;t enter real patient information.
      </p>
      <Link href={`/demo?as=${other}`} className="shrink-0 font-medium underline underline-offset-4">
        Switch to the {ROLE_LABELS[other]}
      </Link>
    </aside>
  );
}
