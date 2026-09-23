'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';

import { useReducedMotion } from '@/lib/motion/use-reduced-motion';
import {
  CARE_LEVEL_META,
  TRIAGE_PREVIEWS,
  type TriagePreview,
} from '@/lib/motion/triage-preview';

/**
 * A worked example of the routing decision.
 *
 * Pick a phrase, watch where it goes and why. It is the shortest honest answer
 * to "what does this actually do" — more convincing than a feature list and
 * more specific than a screenshot.
 *
 * Fixed examples rather than a free-text box, on purpose. A homepage that
 * appeared to triage whatever somebody typed, with none of the rule layer or
 * safety netting behind it, would be making a medical claim it cannot honour.
 * The live assistant is linked at the bottom of the panel, and that is where
 * real symptoms belong.
 */
export function TriageDemo() {
  const [selected, setSelected] = useState<TriagePreview>(TRIAGE_PREVIEWS[0]);
  const reduced = useReducedMotion();
  const meta = CARE_LEVEL_META[selected.careLevel];

  const transition = reduced
    ? { duration: 0 }
    : { duration: 0.55, ease: [0.65, 0, 0.35, 1] as const };

  return (
    <div className="overflow-hidden rounded-[26px] border border-[var(--ink-color)]/10 bg-[var(--bg-color)]">
      {/* Phrase picker */}
      <div
        role="tablist"
        aria-label="Example symptom descriptions"
        className="flex flex-wrap gap-2 border-b border-[var(--ink-color)]/8 p-5 lg:p-6"
      >
        {TRIAGE_PREVIEWS.map((preview) => {
          const active = preview.phrase === selected.phrase;
          return (
            <button
              key={preview.phrase}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setSelected(preview)}
              className={[
                'rounded-full border px-4 py-2 text-left text-[0.82rem] leading-snug transition-all duration-300',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink-color)]',
                active
                  ? 'border-[var(--ink-color)] bg-[var(--ink-color)] text-[var(--bg-color)]'
                  : 'border-[var(--ink-color)]/15 text-[var(--ink-color)]/65 hover:border-[var(--ink-color)]/40 hover:text-[var(--ink-color)]',
              ].join(' ')}
            >
              &ldquo;{preview.phrase}&rdquo;
            </button>
          );
        })}
      </div>

      <div className="grid gap-8 p-6 lg:grid-cols-[1fr_1.15fr] lg:gap-12 lg:p-9">
        {/* Urgency readout */}
        <div>
          <p className="mb-5 text-[0.6rem] uppercase tracking-[0.22em] text-[var(--ink-color)]/40">
            Assessed urgency
          </p>

          <div className="mb-3 flex items-baseline gap-3">
            <AnimatePresence mode="wait">
              <motion.span
                key={`${selected.phrase}-label`}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -8 }}
                transition={transition}
                className={`font-serif text-[2rem] leading-none ${meta.tone}`}
              >
                {meta.label}
              </motion.span>
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={`${selected.phrase}-detail`}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={transition}
              className="mb-7 text-[0.85rem] text-[var(--ink-color)]/55"
            >
              {meta.detail}
            </motion.p>
          </AnimatePresence>

          {/* The scale. An SVG so the marker can sit precisely on it. */}
          <svg viewBox="0 0 300 44" className="w-full" role="img" aria-label={`Urgency: ${meta.label}`}>
            <defs>
              <linearGradient id="triage-scale" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="52%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            <rect x="0" y="18" width="300" height="4" rx="2" fill="url(#triage-scale)" opacity="0.28" />
            <motion.g
              animate={{ x: meta.position * 300 }}
              initial={false}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 130, damping: 18 }}
            >
              <line x1="0" y1="8" x2="0" y2="32" stroke="var(--ink-color)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="0" cy="20" r="5" fill="var(--bg-color)" stroke="var(--ink-color)" strokeWidth="2" />
            </motion.g>
          </svg>

          <div className="mt-2 flex justify-between text-[0.6rem] uppercase tracking-[0.16em] text-[var(--ink-color)]/35">
            <span>Routine</span>
            <span>Urgent</span>
            <span>Emergency</span>
          </div>
        </div>

        {/* Outcome */}
        <div className="flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.phrase}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -12 }}
              transition={transition}
              className="flex flex-1 flex-col"
            >
              <p className="mb-2 text-[0.6rem] uppercase tracking-[0.22em] text-[var(--ink-color)]/40">
                Routed to
              </p>
              <p className="mb-5 font-serif text-[1.5rem] leading-tight">{selected.specialty}</p>

              {selected.rule && (
                <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--ink-color)]/5 px-3 py-1.5 text-[0.72rem] text-[var(--ink-color)]/60">
                  <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {selected.rule}
                </p>
              )}

              <p className="mb-2 text-[0.6rem] uppercase tracking-[0.22em] text-[var(--ink-color)]/40">
                What it says
              </p>
              <p className="text-[0.92rem] leading-[1.7] text-[var(--ink-color)]/75">
                {selected.response}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <p className="border-t border-[var(--ink-color)]/8 px-6 py-4 text-[0.74rem] leading-relaxed text-[var(--ink-color)]/45 lg:px-9">
        Worked examples, not a live assessment — these four responses are fixed. Describe your own
        symptoms in{' '}
        <Link href="/technology" className="text-[var(--ink-color)]/70 underline underline-offset-2">
          SymptomX
        </Link>
        .
      </p>
    </div>
  );
}
