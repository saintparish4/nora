'use client';

import { useMemo, useRef } from 'react';

import { useIsomorphicLayoutEffect } from '@/lib/motion/use-isomorphic-layout-effect';

import { registerGsap, ScrollTrigger, prefersReducedMotion } from '@/lib/motion/gsap';
import { buildSignalPath } from '@/lib/motion/signal';

const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 260;

/** How many distinct paths to pre-compute across the resolve. */
const FRAMES = 48;

interface DiagnosticLineProps {
  /**
   * Scrubs the resolve against this element's scroll progress. Omit it and the
   * line simply plays the resolve once on entry.
   */
  scrubTargetId?: string;
  className?: string;
}

/**
 * NORA's signature graphic: one continuous trace that begins as the noise of
 * somebody describing how they feel and resolves into a clean clinical signal.
 *
 * It is the product argument drawn in a single gesture — the site says "from
 * symptoms to specialist, one seamless step", and this is that sentence as a
 * line. Everything else on the page is typography and restraint; this is the
 * one thing that moves, so it carries the whole idea.
 *
 * Paths are pre-computed into frames rather than solved per tick. Scrubbing
 * recomputes a 220-point Catmull-Rom on every scroll event otherwise, which is
 * exactly the kind of main-thread work that turns a smooth scroll into a janky
 * one on a mid-range phone.
 */
export function DiagnosticLine({ scrubTargetId, className }: DiagnosticLineProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const rootRef = useRef<SVGSVGElement>(null);

  // Frames are deterministic, so they are built once and shared by the visible
  // stroke and the glow beneath it. useMemo rather than a ref because the first
  // frame is read during render to seed the `d` attribute, and refs must not be.
  const frames = useMemo(
    () =>
      Array.from({ length: FRAMES }, (_, index) =>
        buildSignalPath({
          width: VIEW_WIDTH,
          height: VIEW_HEIGHT,
          resolution: index / (FRAMES - 1),
        })
      ),
    []
  );

  useIsomorphicLayoutEffect(() => {
    const path = pathRef.current;
    const glow = glowRef.current;
    const root = rootRef.current;
    if (!path || !glow || !root) return;

    // Reduced motion gets the destination, not the journey: the resolved
    // signal, drawn and still. The idea survives; the movement does not.
    if (prefersReducedMotion()) {
      const settled = frames[frames.length - 1];
      path.setAttribute('d', settled);
      glow.setAttribute('d', settled);
      path.style.strokeDasharray = 'none';
      path.style.strokeDashoffset = '0';
      return;
    }

    const gsap = registerGsap();

    const context = gsap.context(() => {
      const state = { progress: 0 };

      const applyFrame = () => {
        const index = Math.min(
          frames.length - 1,
          Math.max(0, Math.round(state.progress * (frames.length - 1)))
        );
        const d = frames[index];
        path.setAttribute('d', d);
        glow.setAttribute('d', d);
      };

      applyFrame();

      // Draw the trace on, the way a monitor sweeps across a screen. Started
      // immediately rather than on a ScrollTrigger: the line sits in the hero,
      // already past any sensible start threshold at load, and losing that race
      // would leave it permanently dashed out of sight.
      const length = path.getTotalLength();
      gsap.set([path, glow], { strokeDasharray: length, strokeDashoffset: length });
      gsap.to([path, glow], {
        strokeDashoffset: 0,
        duration: 2.1,
        ease: 'power2.out',
        delay: 0.35,
      });

      if (scrubTargetId) {
        const trigger = document.getElementById(scrubTargetId);
        if (trigger) {
          gsap.to(state, {
            progress: 1,
            ease: 'none',
            onUpdate: applyFrame,
            scrollTrigger: {
              trigger,
              start: 'top 70%',
              end: 'bottom 40%',
              scrub: 0.6,
            },
          });
          return;
        }
      }

      // No scrub target: resolve once, on entry.
      gsap.to(state, {
        progress: 1,
        duration: 2.6,
        ease: 'power2.inOut',
        onUpdate: applyFrame,
        scrollTrigger: { trigger: root, start: 'top 80%', once: true },
      });
    }, root);

    ScrollTrigger.refresh();
    return () => context.revert();
  }, [scrubTargetId, frames]);

  return (
    <svg
      ref={rootRef}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className={className}
      fill="none"
      role="img"
      aria-label="A line of noisy symptom data resolving into a steady clinical signal"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="nora-signal-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--ink-color)" stopOpacity="0.12" />
          <stop offset="28%" stopColor="var(--ink-color)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--ink-color)" stopOpacity="0.95" />
        </linearGradient>
        <filter id="nora-signal-glow" x="-10%" y="-60%" width="120%" height="220%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.58  0 0 0 0 0.45  0 0 0 0 0.98  0 0 0 0.45 0"
          />
        </filter>
      </defs>

      {/* Baseline: the calm the trace is resolving towards. */}
      <line
        x1="0"
        y1={VIEW_HEIGHT / 2}
        x2={VIEW_WIDTH}
        y2={VIEW_HEIGHT / 2}
        stroke="var(--ink-color)"
        strokeOpacity="0.07"
        strokeWidth="1"
      />

      <path
        ref={glowRef}
        d={frames[0]}
        stroke="var(--ink-color)"
        strokeWidth="2"
        filter="url(#nora-signal-glow)"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-90 motion-reduce:opacity-50"
      />
      <path
        ref={pathRef}
        d={frames[0]}
        stroke="url(#nora-signal-stroke)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
