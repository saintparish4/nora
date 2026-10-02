'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { getPriorAuthorizations } from '@/lib/api';
import { TOUR_STEPS, readTour, writeTour, type TourPlace, type TourStep } from '@/lib/demo-tour';
import { Button } from '@/components/ui/button';

const WAIT_FOR_TARGET_MS = 10_000;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Plays the guided walkthrough over the workspace: moves to each step's page,
 * spotlights one element, and shows a caption with play, pause, back, and
 * next. Renders nothing unless a walkthrough is in progress in the demo
 * practice.
 */
export function DemoTour() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [place, setPlace] = useState<TourPlace | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [ready, setReady] = useState(false);
  const paths = useRef<Record<string, string | null>>({});

  // Storage is only readable in the browser, after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setPlace(readTour()), []);

  const update = useCallback((next: TourPlace | null) => {
    writeTour(next);
    setReady(false);
    setBox(null);
    setPlace(next);
  }, []);

  const inDemo = Boolean(user?.organization?.demo);
  const step: TourStep | undefined = place ? TOUR_STEPS[place.step] : undefined;
  const finished = place !== null && place.step >= TOUR_STEPS.length;

  const leave = useCallback((current: TourStep | undefined) => {
    current?.after?.forEach((selector) => document.querySelector<HTMLElement>(selector)?.click());
  }, []);

  const go = useCallback(
    (to: number) => {
      if (!place) return;
      leave(step);
      update({ step: Math.max(0, Math.min(to, TOUR_STEPS.length)), playing: place.playing });
    },
    [leave, place, step, update]
  );

  // Get to the right account and page for the step, then find its target.
  useEffect(() => {
    if (!step || !inDemo || !user) return;
    let cancelled = false;
    let poll: number | undefined;

    const arrive = async () => {
      if (user.role !== step.role) {
        router.push(`/demo?as=${step.role}`);
        return;
      }

      let path: string | null;
      if ('path' in step.page) {
        path = step.page.path;
      } else {
        const status = step.page.status;
        if (!(status in paths.current)) {
          const found = await getPriorAuthorizations({ status }).catch(() => null);
          const id = found?.prior_authorizations[0]?.id;
          paths.current[status] = id ? `/dashboard/prior-authorizations/${id}` : null;
        }
        path = paths.current[status];
      }
      if (cancelled) return;
      // Another visitor may have moved the request on. Skip what cannot be shown.
      if (path === null) return go(place!.step + 1);
      if (pathname !== path) return router.push(path);

      const started = Date.now();
      let prepared = false;
      poll = window.setInterval(() => {
        if (!prepared) {
          const first = step.before?.[0];
          if (first && !document.querySelector(first)) {
            if (Date.now() - started > WAIT_FOR_TARGET_MS) go(place!.step + 1);
            return;
          }
          step.before?.forEach((selector) => document.querySelector<HTMLElement>(selector)?.click());
          prepared = true;
        }
        const target = document.querySelector<HTMLElement>(step.target);
        if (!target) {
          if (Date.now() - started > WAIT_FOR_TARGET_MS) go(place!.step + 1);
          return;
        }
        window.clearInterval(poll);
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        // Tall targets sit under the header, clear of the caption at the
        // bottom; short ones are centred.
        const rect = target.getBoundingClientRect();
        const top = rect.height > window.innerHeight - 380 ? rect.top + window.scrollY - 96 : rect.top + window.scrollY - (window.innerHeight - rect.height) / 2 + 80;
        window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
        setReady(true);
      }, 250);
    };

    void arrive();
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
    // `place.step` stands in for `step` and `go`: re-running on every render would restart the wait.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place?.step, inDemo, user?.role, pathname]);

  // Keep the spotlight on the target as the page scrolls and settles.
  useEffect(() => {
    if (!ready || !step) return;
    const measure = () => {
      const target = document.querySelector<HTMLElement>(step.target);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setBox({ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 });
    };
    measure();
    const timer = window.setInterval(measure, 200);
    window.addEventListener('resize', measure);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', measure);
    };
  }, [ready, step]);

  // Move on by itself while playing.
  useEffect(() => {
    if (!ready || !step || !place?.playing) return;
    const timer = window.setTimeout(() => go(place.step + 1), step.seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [ready, step, place, go]);

  if (!place || !inDemo) return null;

  if (finished) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 p-5" role="dialog" aria-modal="true" aria-labelledby="tour-end">
        <div className="w-full max-w-md rounded-tile bg-white p-7 text-center">
          <h2 id="tour-end" className="text-[1.75rem] leading-tight">That is the whole loop.</h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-body">
            Chart to criteria, quotes a person verifies, gaps turned into tasks, a clinician&apos;s approval, and a packet. The
            practice is yours to explore now. Every patient in it is invented.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => update(null)}>Explore it yourself</Button>
            <Button variant="secondary" onClick={() => update({ step: 0, playing: true })}>Watch again</Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            You are signed in as the clinician.{' '}
            <Link href="/demo?as=staff" className="font-medium text-blue-deep hover:underline" onClick={() => update(null)}>
              Switch to the medical assistant
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (!step) return null;

  return (
    <>
      {box && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[60] rounded-[1.75rem] ring-2 ring-blue transition-all duration-300 motion-reduce:transition-none"
          style={{ ...box, boxShadow: '0 0 0 9999px rgba(18, 18, 18, 0.42)' }}
        />
      )}
      <section
        aria-label="Guided walkthrough"
        // An open dialog turns off pointer events for the rest of the page.
        // The controls have to keep working while one is spotlighted.
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-[70] p-3 sm:bottom-5 sm:left-1/2 sm:right-auto sm:w-[34rem] sm:-translate-x-1/2 sm:p-0"
      >
        <div className="rounded-tile bg-ink p-5 text-white shadow-[0_24px_60px_-20px_rgba(18,18,18,0.6)]">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs font-medium tracking-[0.04em] text-white/60 uppercase">
              Walkthrough · {place.step + 1} of {TOUR_STEPS.length} · {step.role === 'staff' ? 'Medical assistant' : 'Clinician'}
            </p>
            <button type="button" onClick={() => { leave(step); update(null); }} className="-m-1 rounded-full p-1 text-white/70 hover:text-white" aria-label="End the walkthrough">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div aria-live="polite">
            <h2 className="mt-2 font-display text-xl font-medium tracking-[-0.02em] text-white">{step.title}</h2>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-white/80">{step.body}</p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={() => go(place.step - 1)} disabled={place.step === 0} className="flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40" aria-label="Previous step" data-tour-control="previous">
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button type="button" onClick={() => update({ ...place, playing: !place.playing })} className="flex h-9 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-ink hover:bg-white/90">
              {place.playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              {place.playing ? 'Pause' : 'Play'}
            </button>
            <button type="button" onClick={() => go(place.step + 1)} className="flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Next step" data-tour-control="next">
              <ChevronRight className="size-4" aria-hidden />
            </button>
            <div className="ml-auto h-1 w-24 overflow-hidden rounded-full bg-white/15" aria-hidden>
              <div className="h-full rounded-full bg-white" style={{ width: `${((place.step + 1) / TOUR_STEPS.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
