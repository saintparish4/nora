'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';

const ROLE_LABELS = { staff: 'medical assistant', clinician: 'clinician', admin: 'admin' } as const;

/**
 * Shown across the workspace while signed in to the shared demo practice:
 * says who the visitor is and that the data is synthetic and shared. Staff do
 * the whole request, so someone who came in as the clinician is offered the
 * way back to the medical assistant, and nobody is sent the other way.
 */
export function DemoBanner() {
  const { user } = useAuth();
  if (!user?.organization?.demo) return null;

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
  return (
    <DemoBannerFrame
      who={<>You are {name}{user.role ? `, the ${ROLE_LABELS[user.role]}` : ''}.</>}
      other={user.role === 'staff' ? undefined : 'staff'}
    />
  );
}

/**
 * The banner's box on its own, so /demo can draw it before sign-in and the
 * workspace below starts where it will stay once the real banner takes over.
 */
export function DemoBannerFrame({ who, other }: { who: React.ReactNode; other?: 'staff' }) {
  return (
    <aside aria-label="Demo practice" className="bg-tile-strong text-sm text-body">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-x-6 gap-y-1.5 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="flex items-start gap-2.5">
          <span className="mt-[7px] size-2 shrink-0 rounded-full bg-orange" aria-hidden />
          <span>
            <span className="font-medium text-ink">Demo practice.</span> {who}{' '}
            <span className="sm:hidden">Synthetic, shared data: no real patient information.</span>
            <span className="hidden sm:inline">
              The data is synthetic and shared with other visitors, so don&apos;t enter real patient information.
            </span>
          </span>
        </p>
        <span className="flex shrink-0 flex-wrap gap-x-5 gap-y-1 pl-[18px] font-medium text-blue-deep sm:pl-0">
          <Link href="/demo?tour=1" className="hover:underline">Watch the walkthrough</Link>
          {other && (
            <Link href={`/demo?as=${other}`} className="inline-flex items-center gap-1 hover:underline">
              Switch to the {ROLE_LABELS[other]}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          )}
        </span>
      </div>
    </aside>
  );
}
