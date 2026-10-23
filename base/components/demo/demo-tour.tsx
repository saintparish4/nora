'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { getPriorAuthorizations } from '@/lib/api';
import { TOUR_REQUEST_STATUS, TOUR_ROLE, TOUR_STEPS, readTour, writeTour, type TourPlace, type TourStep } from '@/lib/demo-tour';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const WAIT_FOR_TARGET_MS = 10_000;
/** Room between the target and the spotlight ring. */
const RING_GAP = 8;
/** How long the spotlight takes to glide from one target to the next. */
const GLIDE_MS = 550;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const mix = (from: Box, to: Box, t: number): Box => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
  width: from.width + (to.width - from.width) * t,
  height: from.height + (to.height - from.height) * t,
});

/** True while the target, or anything inside it, is still loading its data. */
function isBusy(target: HTMLElement): boolean {
  return target.matches('[aria-busy="true"]') || target.querySelector('[aria-busy="true"]') !== null;
}

/**
 * Plays the guided walkthrough over the request page: spotlights one panel
 * per step, gliding from each to the next, and shows a caption with play,
 * pause, back, and next. Renders nothing unless a walkthrough is in progress
 * in the demo practice.
 */
export function DemoTour() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [place, setPlace] = useState<TourPlace | null>(null);
  const [ready, setReady] = useState(false);
  const [placed, setPlaced] = useState(false);
  const ring = useRef<HTMLDivElement>(null);
  /** Where the ring was last drawn, so the next step glides from there. */
  const drawn = useRef<Box | null>(null);
  const requestPath = useRef<string | null | undefined>(undefined);

  // Storage is only readable in the browser, after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setPlace(readTour()), []);

  const update = useCallback((next: TourPlace | null) => {
    writeTour(next);
    setReady(false);
    if (!next) {
      setPlaced(false);
      drawn.current = null;
    }
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

  // Every step plays on the same page: the request waiting for clarification,
  // as the medical assistant. Get there once, then find each step's target.
  useEffect(() => {
    if (!step || !inDemo || !user) return;
    let cancelled = false;
    let poll: number | undefined;

    const arrive = async () => {
      if (user.role !== TOUR_ROLE) {
        router.push(`/demo?as=${TOUR_ROLE}`);
        return;
      }
      if (requestPath.current === undefined) {
        const found = await getPriorAuthorizations({ status: TOUR_REQUEST_STATUS }).catch(() => null);
        const id = found?.prior_authorizations[0]?.id;
        requestPath.current = id ? `/dashboard/prior-authorizations/${id}` : null;
      }
      if (cancelled) return;
      const path = requestPath.current;
      // Another visitor may have moved the request on. Nothing to show then.
      if (path === null) return update(null);
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
        const waited = Date.now() - started > WAIT_FOR_TARGET_MS;
        if (!target) {
          if (waited) go(place!.step + 1);
          return;
        }
        // Spotlighting a panel that still shows placeholders would describe
        // data the visitor cannot see yet. Wait for it, within reason.
        if (isBusy(target) && !waited) return;
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

  // Keep the spotlight on the target every frame, as the page scrolls and
  // settles. On a new step it glides from where it was drawn to the new
  // target's live position, so it arrives even while the page is scrolling
  // there. Written straight to the element as a transform: a React render per
  // frame would be wasted work, and animating top/left shifts the layout.
  useEffect(() => {
    if (!ready || !step) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = drawn.current;
    const started = performance.now();
    let frame = 0;
    const follow = (now: number) => {
      const target = document.querySelector<HTMLElement>(step.target);
      const el = ring.current;
      if (target && el) {
        const rect = target.getBoundingClientRect();
        const goal = { x: rect.left - RING_GAP, y: rect.top - RING_GAP, width: rect.width + 2 * RING_GAP, height: rect.height + 2 * RING_GAP };
        const progress = from && !reduce ? Math.min(1, (now - started) / GLIDE_MS) : 1;
        const box = from ? mix(from, goal, easeOut(progress)) : goal;
        el.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`;
        el.style.width = `${box.width}px`;
        el.style.height = `${box.height}px`;
        drawn.current = box;
        setPlaced(true);
      }
      frame = window.requestAnimationFrame(follow);
    };
    frame = window.requestAnimationFrame(follow);
    return () => window.cancelAnimationFrame(frame);
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
      // Keyed apart from the ring: React would otherwise reuse the ring's
      // element here, along with the size and position written onto it.
      <div key="tour-end" className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 p-5" role="dialog" aria-modal="true" aria-labelledby="tour-end">
        <div className="w-full max-w-md rounded-tile bg-white p-7 text-center">
          <h2 id="tour-end" className="text-[1.75rem] leading-tight">That is the loop.</h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-body">
            Chart to criteria, quotes a person verifies, gaps turned into tasks, and a final check by staff before it goes
            out. See a request that is ready to submit, or one the payer has already decided. Every patient here is invented.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => update(null)}>Explore it yourself</Button>
            <Button variant="secondary" onClick={() => update({ step: 0, playing: true })}>Watch again</Button>
          </div>
          <p className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
            <Link href="/dashboard/prior-authorizations?status=ready_for_review" className="font-medium text-blue-deep hover:underline" onClick={() => update(null)}>
              See a request ready to submit
            </Link>
            <Link href="/dashboard/prior-authorizations?status=approved_by_payer" className="font-medium text-blue-deep hover:underline" onClick={() => update(null)}>
              See a decided request
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (!step) return null;

  return (
    <>
      {(ready || placed) && (
        <div
          key="tour-ring"
          ref={ring}
          aria-hidden
          className={cn(
            'pointer-events-none fixed top-0 left-0 z-[60] rounded-[1.75rem] ring-2 ring-blue transition-opacity duration-200 motion-reduce:transition-none',
            placed ? 'opacity-100' : 'opacity-0'
          )}
          style={{ boxShadow: '0 0 0 9999px rgba(18, 18, 18, 0.42)' }}
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
              Walkthrough · {place.step + 1} of {TOUR_STEPS.length} · Medical assistant
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
