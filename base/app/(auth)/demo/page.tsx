'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { AuthShell, FormError } from '@/components/navigation/auth-shell';
import { Button } from '@/components/ui/button';
import type { DemoRole } from '@/types';

/** How long before we explain that the API may be waking from idle. */
const SLOW_AFTER_MS = 5000;

const ROLE_LABELS: Record<DemoRole, string> = {
  staff: 'medical assistant',
  clinician: 'clinician',
};

/**
 * One-click entry to the shared demo practice: /demo, or /demo?as=clinician.
 * Opens on its own unless the visitor is signed in to a real practice, where
 * replacing their session needs a click.
 */
function DemoContent() {
  const role: DemoRole = useSearchParams().get('as') === 'clinician' ? 'clinician' : 'staff';
  const { user, loading, enterDemo } = useAuth();
  const [opening, setOpening] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState('');
  const started = useRef(false);

  const ownPractice = user && !user.organization?.demo ? user.organization?.name ?? 'your practice' : null;

  const open = useCallback(async () => {
    setError('');
    setSlow(false);
    setOpening(true);
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    try {
      await enterDemo(role);
    } catch (err: unknown) {
      // fetch rejects with a TypeError when the server cannot be reached.
      setError(
        err instanceof TypeError
          ? 'Could not reach the Nora API. It may still be waking up; try again in a moment.'
          : err instanceof Error ? err.message : 'The demo could not be opened.'
      );
      setOpening(false);
    } finally {
      window.clearTimeout(timer);
    }
  }, [enterDemo, role]);

  useEffect(() => {
    if (loading || ownPractice || started.current) return;
    started.current = true;
    void open();
  }, [loading, ownPractice, open]);

  if (ownPractice && !opening && !error) {
    return (
      <AuthShell title="Open the demo?" subtitle="A practice with synthetic patients, ready to explore.">
        <p className="mb-6 text-[0.9375rem] leading-relaxed text-body">
          You are signed in to {ownPractice}. Opening the demo signs you out of it.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={open}>Open the demo</Button>
          <Button asChild variant="secondary"><Link href="/dashboard">Back to {ownPractice}</Link></Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Opening the demo" subtitle="A practice with synthetic patients, ready to explore.">
      {error ? (
        <>
          <FormError message={error} />
          <div className="flex flex-wrap gap-3">
            <Button onClick={open}>Try again</Button>
            <Button asChild variant="secondary"><Link href="/login">Sign in instead</Link></Button>
          </div>
        </>
      ) : (
        <div role="status" className="space-y-3 text-[0.9375rem] leading-relaxed text-body">
          <p className="flex items-center gap-3">
            <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-blue" aria-hidden />
            Signing you in as the practice&apos;s {ROLE_LABELS[role]}…
          </p>
          {slow && (
            <p>
              Still waking the demo server. It sleeps when nobody is using it, so the first visit can take up to a minute.
            </p>
          )}
        </div>
      )}
    </AuthShell>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <DemoContent />
    </Suspense>
  );
}
