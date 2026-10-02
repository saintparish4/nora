import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { NoraLogo, NoraMark } from '@/components/navigation/nora-logo';
import { HeroArtLeft, HeroArtRight, HeroArtRow, CheckShape, NoteShape, QuoteShape, CapsuleShape, SparkShape } from '@/components/landing/hero-art';
import { WorkedExample } from '@/components/landing/worked-example';
import { Pill } from '@/components/workspace/status-pill';
import { PA_STATUS_LABELS, PA_STATUS_TONES, TONE_DOTS } from '@/lib/prior-auth';
import { cn } from '@/lib/utils';
import type { PaStatus } from '@/types';

const SOURCE_URL = 'https://github.com/saintparish4/nora';

const pill = 'inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[-0.01em] transition-colors';
const primaryPill = `${pill} bg-primary text-primary-foreground hover:bg-[#2b2b2b]`;
const secondaryPill = `${pill} bg-tile-strong text-ink hover:bg-tile-hover`;

const PRINCIPLES = [
  {
    title: 'Evidence with citations',
    className: 'text-blue-deep',
    body: "Every excerpt is the chart's own words at a known place in a known document. A quote that is not in the chart cannot be saved, whoever proposed it.",
  },
  {
    title: 'People decide',
    className: 'text-green-deep',
    body: 'Staff verify each excerpt and a clinician approves the packet. Nora never marks a requirement met on its own and never judges medical necessity.',
  },
  {
    title: 'Gaps become tasks',
    className: 'text-orange-deep',
    body: 'When documentation is missing or unclear, the ordering clinician gets a task that names the criterion. It closes when the requirement is resolved.',
  },
  {
    title: 'A record of everything',
    className: 'text-purple-deep',
    body: 'Each status change has a person and a time. Approval pins exactly what was approved, and any edit afterwards sends the request back for review.',
  },
];

// The statuses the demo's decided request actually passed through, in order.
const JOURNEY: PaStatus[] = ['gathering', 'ready_for_review', 'approved', 'submitted', 'payer_pending', 'approved_by_payer'];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1088px] items-center gap-8 px-5 sm:px-8">
          <NoraLogo />
          <nav aria-label="Sections" className="hidden items-center gap-1 text-[0.9375rem] font-medium text-body md:flex">
            <a href="#example" className="rounded-full px-3 py-2 hover:bg-tile-strong hover:text-ink">Example</a>
            <a href="#how" className="rounded-full px-3 py-2 hover:bg-tile-strong hover:text-ink">How it works</a>
            <a href={SOURCE_URL} className="rounded-full px-3 py-2 hover:bg-tile-strong hover:text-ink">Source</a>
          </nav>
          <div className="ml-auto flex items-center gap-2.5 text-[0.9375rem]">
            <Link href="/login" className={`${secondaryPill} h-9 px-4`}>Sign in</Link>
            <Link href="/demo" className={`${primaryPill} h-9 px-4`}>See the demo</Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <HeroArtLeft />
          <HeroArtRight />
          <div className="relative mx-auto max-w-[620px] px-5 pt-14 pb-20 text-center sm:px-8 sm:pt-24 sm:pb-28 lg:min-h-[520px]">
            <HeroArtRow />
            <h1 className="text-[2.75rem] leading-[1.06] tracking-[-0.035em] text-[#343433] sm:text-[4.25rem] sm:leading-[1.08]">
              Healthcare, followed through.
            </h1>
            <p className="mx-auto mt-5 max-w-[30rem] text-[1.0625rem] leading-[1.55] font-medium text-body">
              Nora checks a patient&apos;s chart against the payer&apos;s criteria, quotes the evidence for each one, and
              prepares the prior authorization packet for a person to approve.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/demo" className={`${primaryPill} h-12 px-6 text-[1.0625rem]`}>
                See the demo
                <ArrowRight aria-hidden className="size-[18px]" />
              </Link>
              <a href={SOURCE_URL} className={`${secondaryPill} h-12 px-6 text-[1.0625rem]`}>Read the source</a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No sign-up. It opens a practice with synthetic patients and requests already in progress.
            </p>
          </div>
        </section>

        {/* One request, three criteria */}
        <section id="example" aria-labelledby="example-heading" className="mx-auto max-w-[1088px] scroll-mt-24 px-5 pb-24 sm:px-8">
          <div className="mx-auto mb-12 max-w-[640px] text-center">
            <h2 id="example-heading" className="text-[2rem] leading-[1.1] sm:text-[2.75rem]">One request, three criteria.</h2>
            <p className="mt-4 text-[1.0625rem] leading-[1.55] text-body">
              A synthetic patient, a request for Wegovy, and the criteria her plan applies. Nora quotes the chart for
              each one. A person decides whether the quote is enough.
            </p>
          </div>
          <WorkedExample />
          <p className="mx-auto mt-10 max-w-[640px] text-center text-sm leading-relaxed text-muted-foreground">
            This is a request in the demo practice, not a mock-up of one.{' '}
            <Link href="/demo" className="font-medium text-blue-deep hover:underline">Open it</Link> to see the other four
            criteria, the note each quote came from, and the timeline. The criteria are illustrative, not any
            payer&apos;s published policy.
          </p>
        </section>

        {/* Principles */}
        <section aria-label="What Nora guarantees" className="bg-tile">
          <div className="mx-auto grid max-w-[1088px] gap-x-16 gap-y-12 px-5 py-20 sm:px-8 md:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p.title}>
                <h3 className={cn('font-sans text-[0.9375rem] font-semibold tracking-normal', p.className)}>{p.title}</h3>
                <p className="mt-2 text-[1.0625rem] leading-[1.55] text-body">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* From order to packet */}
        <section id="how" aria-labelledby="how-heading" className="mx-auto grid max-w-[1088px] scroll-mt-24 items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-[0.9375rem] font-semibold text-green-deep">From order to packet</p>
            <h2 id="how-heading" className="mt-3 text-[2rem] leading-[1.1] sm:text-[2.75rem]">
              Pick up where the clinician left off.
            </h2>
            <p className="mt-5 max-w-[30rem] text-[1.0625rem] leading-[1.55] text-body">
              The clinician has already decided what the patient needs. A medical assistant adds the chart notes, picks
              the medication and the plan, and Nora does the searching.
            </p>
            <ul className="mt-6 space-y-3 text-[1.0625rem] font-medium text-green-deep">
              {['One requirement per payer criterion', 'Chart quotes with their source and date', 'Clinician approval, then a PDF packet'].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <Check aria-hidden className="size-5 shrink-0" strokeWidth={2.75} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2rem] bg-tile p-5 sm:p-8">
            <div className="rounded-2xl border border-border bg-white p-5">
              <p className="font-medium text-ink">Elena Petrov · Wegovy</p>
              <p className="mt-0.5 text-sm text-muted-foreground">A request in the demo practice, from first read to payer decision</p>
              <ol className="relative mt-5 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-input">
                {JOURNEY.map((status) => (
                  <li key={status} className="relative flex items-center gap-3 pl-6">
                    <span className={cn('absolute left-0 size-[11px] rounded-full ring-4 ring-white', TONE_DOTS[PA_STATUS_TONES[status]])} aria-hidden />
                    <Pill tone={PA_STATUS_TONES[status]}>{PA_STATUS_LABELS[status]}</Pill>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Closing band */}
        <section aria-labelledby="explore-heading" className="bg-tile">
          <div className="mx-auto grid max-w-[1088px] items-center gap-10 px-5 py-20 sm:px-8 md:grid-cols-[1.1fr_1fr]">
            <div>
              <h2 id="explore-heading" className="text-[2rem] leading-[1.1] sm:text-[2.75rem]">Explore Nora.</h2>
              <p className="mt-4 max-w-[26rem] text-[1.0625rem] leading-[1.55] text-body">
                Sign in as the medical assistant to review evidence, or as the clinician to approve a packet. Every
                patient and note is invented.
              </p>
              <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-[1.0625rem] font-medium text-blue-deep">
                <Link href="/demo" className="inline-flex items-center gap-2 hover:underline">
                  Open as the medical assistant <ArrowRight aria-hidden className="size-[18px]" />
                </Link>
                <Link href="/demo?as=clinician" className="inline-flex items-center gap-2 hover:underline">
                  Open as the clinician <ArrowRight aria-hidden className="size-[18px]" />
                </Link>
              </div>
            </div>
            <div aria-hidden className="relative mx-auto hidden h-[190px] w-full max-w-[420px] md:block">
              <NoteShape className="absolute top-2 left-4 w-[130px] -rotate-6" />
              <CheckShape className="absolute top-0 left-[150px] w-[76px]" />
              <QuoteShape className="absolute top-[78px] left-[178px] w-[92px] rotate-6" />
              <CapsuleShape className="absolute top-[30px] left-[270px] w-[132px] rotate-12" />
              <SparkShape className="absolute top-[150px] left-[120px] w-6" />
              <SparkShape className="absolute top-[120px] left-[330px] w-5" color="#7DC4FF" />
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1088px] flex-col gap-6 px-5 py-12 text-sm text-muted-foreground sm:px-8 md:flex-row md:items-start md:justify-between">
        <NoraMark className="text-[#b9b4ac]" />
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/demo" className="hover:text-ink">Demo</Link>
          <Link href="/login" className="hover:text-ink">Sign in</Link>
          <Link href="/signup" className="hover:text-ink">Set up a practice</Link>
          <a href={SOURCE_URL} className="hover:text-ink">Source</a>
        </nav>
        <p className="max-w-[26rem] md:text-right">
          Nora prepares administrative work for people to review. It does not make clinical or coverage decisions.
        </p>
      </footer>
    </div>
  );
}
