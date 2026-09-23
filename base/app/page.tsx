'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { NoraLogo } from '@/components/navigation/nora-logo';
import { DiagnosticLine } from '@/components/marketing/diagnostic-line';
import { MagneticButton } from '@/components/marketing/magnetic-button';
import { Marquee, type MarqueeItem } from '@/components/marketing/marquee';
import { SiteHeader, MARKETING_NAV } from '@/components/marketing/site-header';
import { TriageDemo } from '@/components/marketing/triage-demo';
import { FadeUp, RevealText } from '@/components/marketing/reveal';
import { SearchConsole } from '@/components/marketing/search-console';
import { useAuth } from '@/lib/auth/context';

const PARTNERS: MarqueeItem[] = [
  { name: 'Baylor Scott & White', logo: '/logos/Baylor_Scott__White_Logo.png' },
  { name: 'Capsule Pharmacy', logo: '/logos/Capsule_Pharmacy_Logo-s640.png' },
  { name: 'Exact Sciences', logo: '/logos/Exact_Sciences_Logo-s640.png' },
  { name: 'Labcorp', logo: '/logos/Laboratory_Corporation_of_America_Holdings_Logo.png' },
  { name: 'Montefiore', logo: '/logos/mhs-montefiore-new-rochelle.png' },
  { name: 'Mount Sinai', logo: '/logos/mount-sinai.png' },
  { name: 'Nano X Imaging', logo: '/logos/Nano_X_Imaging_Logo-s640.png' },
  { name: 'Summit Health', logo: '/logos/Summit_Health_Logo-s640.png' },
  { name: 'Synthego', logo: '/logos/Synthego_Logo.png' },
];

const STEPS = [
  {
    index: '01',
    title: 'Describe it plainly',
    body: 'No dropdowns, no body-part diagram, no guessing which specialty you need. Write it the way you would say it out loud.',
  },
  {
    index: '02',
    title: 'We read the urgency',
    body: 'A deterministic rule layer screens for emergencies before any model runs. What it does not catch, the model assesses — and disagreement always escalates.',
  },
  {
    index: '03',
    title: 'Booked, not suggested',
    body: 'A matched specialist with real availability and a confirmed time. The step most tools leave to you is the one we finish.',
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push('/dashboard');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-color)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--beam-start)] border-t-transparent" />
          <p className="text-sm text-[var(--ink-color)]/50">Loading…</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-color)] font-sans text-[var(--ink-color)]">
      <div className="noise-overlay" />

      <SiteHeader />

      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative mx-auto max-w-[1240px] px-6 pb-8 pt-10 lg:px-10 lg:pt-16">
        <div className="pointer-events-none absolute left-1/2 top-[18%] -z-10 h-[46vh] w-[90px] -translate-x-1/2 opacity-70">
          <div className="aura-beam h-full w-full" />
        </div>

        <FadeUp immediate className="mb-7 flex justify-center">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-[var(--ink-color)]/12 bg-[var(--bg-color)]/60 px-4 py-1.5 text-[0.68rem] uppercase tracking-[0.2em] text-[var(--ink-color)]/55 backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--beam-start)] opacity-70 motion-reduce:hidden" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--beam-start)]" />
            </span>
            Care navigation, not a symptom checker
          </span>
        </FadeUp>

        <h1 className="mx-auto max-w-[19ch] text-center font-serif text-[2.6rem] leading-[1.04] tracking-[-0.035em] sm:text-[3.6rem] md:text-[4.6rem] lg:text-[5.4rem]">
          <RevealText immediate as="span" className="block">
            From symptoms to specialist,
          </RevealText>
          <RevealText
            immediate
            as="span"
            className="block italic text-[var(--ink-color)]/70"
            delay={0.12}
          >
            one seamless step.
          </RevealText>
        </h1>

        <FadeUp immediate delay={0.25} className="mx-auto mt-7 max-w-[54ch] text-center">
          <p className="text-[1rem] leading-[1.7] text-[var(--ink-color)]/62">
            Most tools stop at a list of possibilities. NORA reads what you wrote, decides how
            urgently you need to be seen, finds a clinician who treats it, and books the visit.
          </p>
        </FadeUp>

        <FadeUp immediate delay={0.35} className="mt-11 flex justify-center">
          <SearchConsole />
        </FadeUp>

        {/* The signature. Its resolve is scrubbed by the section below. */}
        <div className="relative mt-16 lg:mt-20">
          <DiagnosticLine
            scrubTargetId="resolve"
            className="h-[150px] w-full sm:h-[190px] lg:h-[230px]"
          />
          <div className="mt-2 flex items-center justify-between px-1 text-[0.6rem] uppercase tracking-[0.22em] text-[var(--ink-color)]/35">
            <span>What you describe</span>
            <span className="hidden sm:inline">Triage</span>
            <span>Where to go</span>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Trust                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="mt-14 border-y border-[var(--ink-color)]/8 py-12">
        <p className="mb-9 text-center text-[0.62rem] uppercase tracking-[0.24em] text-[var(--ink-color)]/40">
          Trusted by leading health systems
        </p>
        <Marquee items={PARTNERS} />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it resolves                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section id="resolve" className="mx-auto max-w-[1240px] px-6 py-24 lg:px-10 lg:py-32">
        <div className="mb-16 flex flex-col gap-4 border-b border-[var(--ink-color)]/8 pb-8 md:flex-row md:items-end md:justify-between">
          <h2 className="max-w-[16ch] font-serif text-[2rem] leading-[1.1] tracking-[-0.02em] sm:text-[2.6rem]">
            <RevealText as="span">Three steps, and none of them are yours.</RevealText>
          </h2>
          <FadeUp>
            <p className="max-w-[34ch] text-[0.92rem] leading-[1.7] text-[var(--ink-color)]/55">
              The work between &ldquo;something is wrong&rdquo; and &ldquo;I have an
              appointment&rdquo; is the part that gets skipped. It is the part we automate.
            </p>
          </FadeUp>
        </div>

        <ol className="grid gap-px overflow-hidden rounded-[24px] border border-[var(--ink-color)]/8 bg-[var(--ink-color)]/8 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.index} className="bg-[var(--bg-color)]">
              <FadeUp
                delay={index * 0.1}
                className="group h-full p-8 transition-colors duration-500 hover:bg-[var(--ink-color)]/[0.025] lg:p-10"
              >
                <div className="mb-8 flex items-baseline justify-between">
                  <span className="font-serif text-[0.95rem] italic text-[var(--ink-color)]/35">
                    {step.index}
                  </span>
                  <span
                    aria-hidden
                    className="h-px w-8 origin-right scale-x-0 bg-[var(--ink-color)]/40 transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover:scale-x-100 motion-reduce:transition-none"
                  />
                </div>
                <h3 className="mb-3 font-serif text-[1.45rem] leading-[1.2] tracking-[-0.01em]">
                  {step.title}
                </h3>
                <p className="text-[0.9rem] leading-[1.7] text-[var(--ink-color)]/58">
                  {step.body}
                </p>
              </FadeUp>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* See it decide                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-[1240px] px-6 pb-24 lg:px-10 lg:pb-32">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 className="max-w-[18ch] font-serif text-[2rem] leading-[1.1] tracking-[-0.02em] sm:text-[2.6rem]">
            <RevealText as="span">See what it does with a sentence.</RevealText>
          </h2>
          <FadeUp>
            <p className="max-w-[32ch] text-[0.92rem] leading-[1.7] text-[var(--ink-color)]/55">
              Pick a description and watch where it routes — and, when a rule fires, why the model
              never got a say.
            </p>
          </FadeUp>
        </div>

        <FadeUp delay={0.1}>
          <TriageDemo />
        </FadeUp>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Safety — the actual differentiator                                */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y border-[var(--ink-color)]/8 bg-[var(--ink-color)]/[0.018]">
        <div className="mx-auto grid max-w-[1240px] gap-14 px-6 py-28 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24 lg:px-10 lg:py-36">
          <div>
            <p className="mb-6 text-[0.62rem] uppercase tracking-[0.24em] text-[var(--ink-color)]/40">
              How it fails
            </p>
            <h2 className="mb-7 font-serif text-[2rem] leading-[1.12] tracking-[-0.02em] sm:text-[2.7rem]">
              <RevealText as="span">
                Anyone can call a model. Almost nobody can tell you when it was wrong.
              </RevealText>
            </h2>
            <FadeUp>
              <p className="max-w-[46ch] text-[0.95rem] leading-[1.75] text-[var(--ink-color)]/58">
                A triage tool is defined by what it does on its worst day, not its best. If the
                model times out, returns nonsense, or simply gets it wrong, the honest answer is
                to send you somewhere more urgent — never less.
              </p>
            </FadeUp>

            {/* The actual copy a patient sees when the assessment cannot run.
                Shown verbatim rather than described: a claim about honesty is
                worth more when you can read the thing being claimed. */}
            <FadeUp delay={0.15} className="mt-10">
              <figure className="max-w-[44ch] rounded-[20px] border border-[var(--ink-color)]/10 bg-[var(--bg-color)] p-6">
                <figcaption className="mb-4 flex items-center gap-2.5 text-[0.6rem] uppercase tracking-[0.2em] text-[var(--ink-color)]/40">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  When the check fails
                </figcaption>
                <blockquote className="text-[0.92rem] leading-[1.7] text-[var(--ink-color)]/75">
                  &ldquo;We could not automatically assess your symptoms. Please have them
                  reviewed by a provider — and if this feels like an emergency, call 911 or go to
                  the nearest emergency room rather than waiting for an appointment.&rdquo;
                </blockquote>
                <p className="mt-4 border-t border-[var(--ink-color)]/8 pt-4 text-[0.78rem] leading-[1.6] text-[var(--ink-color)]/45">
                  Not a recommendation dressed up as one. The response is routed to urgent care,
                  flagged as unassessed, and never cached.
                </p>
              </figure>
            </FadeUp>
          </div>

          <ul className="flex flex-col divide-y divide-[var(--ink-color)]/8 border-t border-[var(--ink-color)]/8">
            {[
              {
                term: 'Rules run before the model',
                detail:
                  'Chest pain, stroke signs, anaphylaxis, uncontrolled bleeding and suicidal ideation route to emergency care by fixed rule. If one fires, no model is consulted — so it still works during an outage.',
              },
              {
                term: 'Failure escalates, never relaxes',
                detail:
                  'A timeout or an unreadable response returns “we could not assess this”, points you to urgent care, and says so plainly. It never quietly resolves to “routine”.',
              },
              {
                term: 'Every recommendation carries its own exit',
                detail:
                  'Told it can wait? You are also told exactly what would change that, and to call 911 if it does.',
              },
              {
                term: 'Every decision is recorded',
                detail:
                  'Each assessment is stored with its confidence and what actually happened at the visit — the only way to prove routing is getting better rather than assert it.',
              },
            ].map((item, index) => (
              <li key={item.term}>
                <FadeUp delay={index * 0.07} className="py-7">
                  <div className="flex gap-5">
                    <span
                      aria-hidden
                      className="mt-[0.55rem] h-px w-6 shrink-0 bg-[var(--ink-color)]/25"
                    />
                    <div>
                      <h3 className="mb-2 text-[1rem] font-medium tracking-[-0.01em]">
                        {item.term}
                      </h3>
                      <p className="text-[0.89rem] leading-[1.7] text-[var(--ink-color)]/55">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                </FadeUp>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Close                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-[1240px] px-6 py-32 text-center lg:px-10 lg:py-44">
        <h2 className="mx-auto mb-8 max-w-[15ch] font-serif text-[2.4rem] leading-[1.06] tracking-[-0.03em] sm:text-[3.4rem] lg:text-[4.2rem]">
          <RevealText as="span">Start with a sentence.</RevealText>
        </h2>
        <FadeUp delay={0.15}>
          <p className="mx-auto mb-11 max-w-[42ch] text-[0.98rem] leading-[1.7] text-[var(--ink-color)]/58">
            Describe what you are feeling. We will take it from there.
          </p>
        </FadeUp>
        <FadeUp delay={0.25} className="flex flex-wrap items-center justify-center gap-4">
          <MagneticButton href="/technology" withArrow>
            Try SymptomX
          </MagneticButton>
          <MagneticButton href="/signup" variant="outline">
            Create an account
          </MagneticButton>
        </FadeUp>
      </section>

      <footer className="border-t border-[var(--ink-color)]/8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-6 py-10 text-[0.8rem] text-[var(--ink-color)]/45 md:flex-row md:items-center md:justify-between lg:px-10">
          <p className="max-w-[58ch] leading-[1.6]">
            NORA helps you decide where to seek care. It does not diagnose, and it is not a
            substitute for a clinician. In an emergency, call 911.
          </p>
          <div className="flex gap-6">
            {MARKETING_NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[var(--ink-color)]/45 no-underline transition-colors duration-300 hover:text-[var(--ink-color)]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
