'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { AuthShell, FormError } from '@/components/navigation/auth-shell';
import { Button } from '@/components/ui/button';
import { WakeLog, formatSeconds, type WakeLine } from '@/components/demo/wake-log';
import { wakeApi } from '@/lib/api/health';
import { readTour, startTour } from '@/lib/demo-tour';
import type { DemoRole } from '@/types';

/** How long before we explain that the API may be waking from idle. */
const SLOW_AFTER_MS = 5000;

const ROLE_LABELS: Record<DemoRole, string> = {
  staff: 'medical assistant',
  clinician: 'clinician',
};

/** A first probe answered this fast means the API was already up. */
const ALREADY_AWAKE_MS = 1500;

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

/**
 * One-click entry to the shared demo practice: /demo, or /demo?as=clinician.
 * Opens on its own unless the visitor is signed in to a real practice, where
 * replacing their session needs a click.
 */
function DemoContent() {
  const params = useSearchParams();
  const role: DemoRole = params.get('as') === 'clinician' ? 'clinician' : 'staff';
  // /demo?tour=1 starts the guided walkthrough; a walkthrough already under
  // way passes through here when it changes account.
  const wantsTour = params.get('tour') === '1';
  const { user, loading, enterDemo } = useAuth();
  const [opening, setOpening] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState('');
  const [lines, setLines] = useState<WakeLine[]>([]);
  const started = useRef(false);
  const run = useRef<AbortController | null>(null);
  const nextLine = useRef(0);

  const ownPractice = user && !user.organization?.demo ? user.organization?.name ?? 'your practice' : null;

  const open = useCallback(async () => {
    run.current?.abort();
    const controller = new AbortController();
    run.current = controller;
    const live = () => !controller.signal.aborted;

    const add = (line: Omit<WakeLine, 'id'>) => {
      const id = nextLine.current++;
      if (live()) setLines(current => [...current, { id, ...line }]);
      return id;
    };
    const settle = (id: number, line: Omit<WakeLine, 'id'>) => {
      if (live()) setLines(current => current.map(l => (l.id === id ? { id, ...line } : l)));
    };

    setError('');
    setSlow(false);
    setOpening(true);
    setLines([]);
    const timer = window.setTimeout(() => live() && setSlow(true), SLOW_AFTER_MS);
    try {
      add({ tone: 'command', text: `nora demo --as ${role === 'staff' ? 'medical-assistant' : 'clinician'}${wantsTour ? ' --tour' : ''}` });
      add({ tone: 'step', text: 'waking the API' });

      let probeStarted = Date.now();
      let probe = add({ tone: 'detail', text: 'GET /up', pendingSince: probeStarted });
      const waited = await wakeApi({
        signal: controller.signal,
        onAttempt: ({ result }) => {
          const took = formatSeconds(Date.now() - probeStarted);
          const answer = result.ok ? `${result.status}${result.status === 200 ? ' OK' : ''}` : result.status ? `${result.status}, not ready` : 'no answer yet';
          settle(probe, { tone: 'detail', text: `GET /up · ${answer} · ${took}` });
          if (!result.ok) {
            probeStarted = Date.now();
            probe = add({ tone: 'detail', text: 'GET /up', pendingSince: probeStarted });
          }
        },
      });
      add({ tone: 'done', text: waited < ALREADY_AWAKE_MS ? 'API already awake' : `API awake after ${formatSeconds(waited)}` });

      const signIn = add({ tone: 'step', text: 'POST /api/v1/auth/demo', pendingSince: Date.now() });
      if (wantsTour) startTour();
      // The walkthrough decides where to go next, so land it on Today.
      await enterDemo(role, readTour() ? '/dashboard' : undefined);
      settle(signIn, { tone: 'done', text: `signed in as the practice's ${ROLE_LABELS[role]}` });
      add({ tone: 'step', text: wantsTour ? 'starting the walkthrough' : 'opening the practice' });
    } catch (err: unknown) {
      if (isAbort(err) || !live()) return;
      // fetch rejects with a TypeError when the server cannot be reached.
      const message = err instanceof TypeError
        ? 'Could not reach the Nora API. It may still be waking up; try again in a moment.'
        : err instanceof Error ? err.message : 'The demo could not be opened.';
      setLines(current => [
        ...current.map(l => (l.pendingSince === undefined ? l : { ...l, text: `${l.text} · failed`, pendingSince: undefined })),
        { id: nextLine.current++, tone: 'fail', text: err instanceof TypeError ? 'gave up waiting for the API' : 'sign-in refused' },
      ]);
      setError(message);
      setOpening(false);
    } finally {
      window.clearTimeout(timer);
    }
  }, [enterDemo, role, wantsTour]);

  useEffect(() => {
    if (loading || ownPractice || started.current) return;
    started.current = true;
    void open();
  }, [loading, ownPractice, open]);

  // Leaving the page while the API wakes must not land the visitor in the
  // demo later. Resetting `started` lets Strict Mode's remount start again.
  useEffect(() => () => {
    run.current?.abort();
    started.current = false;
  }, []);

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
      <div className="space-y-4">
        {lines.length > 0 && <WakeLog lines={lines} />}
        {error ? (
          <>
            <FormError message={error} />
            <div className="flex flex-wrap gap-3">
              <Button onClick={open}>Try again</Button>
              <Button asChild variant="secondary"><Link href="/login">Sign in instead</Link></Button>
            </div>
          </>
        ) : (
          slow && (
            <p className="text-[0.9375rem] leading-relaxed text-body">
              The demo server sleeps when nobody is using it, so the first visit can take up to a minute.
            </p>
          )
        )}
      </div>
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
