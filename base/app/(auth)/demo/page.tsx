'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PrefetchKind } from 'next/dist/client/components/router-reducer/router-reducer-types';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { AuthShell, FormError } from '@/components/navigation/auth-shell';
import { Button } from '@/components/ui/button';
import { DemoStage, type DemoScreen } from '@/components/demo/demo-stage';
import { WakeLog, formatSeconds, type WakeLine } from '@/components/demo/wake-log';
import { apiAnsweredAgo, wakeApi } from '@/lib/api/health';
import { preloadRequest, preloadToday } from '@/lib/api/preload';
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

/** The landing page's own probe counts if it was answered this recently. */
const FRESH_ANSWER_MS = 20_000;

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

/** Start the destination's reads; its hooks pick them up when it mounts. */
function preloadFor(path: string): void {
  const request = path.match(/^\/dashboard\/prior-authorizations\/(\d+)$/);
  if (request) preloadRequest(Number(request[1]));
  else if (path === '/dashboard') preloadToday();
}

/**
 * One-click entry to the shared demo practice: /demo, or /demo?as=clinician.
 * Opens on its own unless the visitor is signed in to a real practice, where
 * replacing their session needs a click.
 */
function DemoContent() {
  const params = useSearchParams();
  const router = useRouter();
  const role: DemoRole = params.get('as') === 'clinician' ? 'clinician' : 'staff';
  // /demo?tour=1 starts the guided walkthrough; a walkthrough already under
  // way passes through here when it changes account.
  const wantsTour = params.get('tour') === '1';
  const [screen] = useState<DemoScreen>(() => (role === 'staff' && !wantsTour && !readTour() ? 'request' : 'today'));
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

      const ago = apiAnsweredAgo();
      if (ago !== null && ago < FRESH_ANSWER_MS) {
        // The landing page already woke it; asking again would only cost a round trip.
        add({ tone: 'done', text: `API awake (answered ${formatSeconds(ago)} ago)` });
      } else {
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
      }

      const signIn = add({ tone: 'step', text: 'POST /api/v1/auth/demo', pendingSince: Date.now() });
      if (wantsTour) startTour();
      // The walkthrough decides where to go next, so land it on Today.
      await enterDemo(role, readTour() ? '/dashboard' : undefined, async path => {
        settle(signIn, { tone: 'done', text: `signed in as the practice's ${ROLE_LABELS[role]}` });
        add({ tone: 'step', text: path === '/dashboard' ? 'opening Today' : 'opening the request' });
        // Go now rather than when the data is in: the screen's skeleton is the
        // one already drawn under this log, and its hooks take over these
        // requests in flight instead of starting their own.
        preloadFor(path);
      });
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

  // Fetch the destination's code while the API wakes. Every request page runs
  // the same code, so any id will do until sign-in names the featured one.
  // FULL, because the default stops at the route's loading skeleton and leaves
  // the page's own code to load after the visitor arrives.
  useEffect(() => {
    router.prefetch(screen === 'request' ? '/dashboard/prior-authorizations/0' : '/dashboard', { kind: PrefetchKind.FULL });
  }, [router, screen]);

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
    <DemoStage screen={screen} role={role}>
      <WakeLog lines={lines} />
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
    </DemoStage>
  );
}

export default function DemoPage() {
  return (
    // Search params are only known in the browser. Until then, draw the stage
    // for the commonest entry (the featured request) instead of a blank page.
    <Suspense fallback={<DemoStage screen="request" role={null}><WakeLog lines={[]} /></DemoStage>}>
      <DemoContent />
    </Suspense>
  );
}
