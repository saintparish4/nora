import Link from 'next/link';
import { Pill } from '@/components/workspace/status-pill';
import type { Tone } from '@/lib/prior-auth';

/**
 * Three criteria from the request the demo opens on. The text is copied from
 * the demo seeds (api/db/seeds), so what a visitor reads here is what they
 * find when they open it. Keep the two in step.
 */
const ROWS: Array<{
  criterion: string;
  quote: string;
  source: string;
  rejected?: boolean;
  status: { label: string; tone: Tone };
  outcome: string;
}> = [
  {
    criterion:
      'BMI of 30 kg/m2 or greater, or 27 kg/m2 or greater with at least one weight-related comorbidity, documented within the last 6 months.',
    quote: 'Assessment: Obesity, class I (E66.01), BMI 34.0-34.9 (Z68.34).',
    source: 'Office visit, Aug 12, 2026',
    status: { label: 'Met', tone: 'success' },
    outcome: 'A rule found the sentence. The medical assistant read it in the note and verified it.',
  },
  {
    criterion:
      'A trial of at least one other weight-management medication is documented, with its outcome or the reason it was stopped.',
    quote: 'Previously tried Saxenda (liraglutide) from 2025-06 to 2025-10; discontinued due to persistent nausea and vomiting.',
    source: 'Office visit, Aug 12, 2026',
    status: { label: 'Met', tone: 'success' },
    outcome: 'The note names the drug, the dates, and why it was stopped. That is a documented trial.',
  },
  {
    criterion:
      'Trial of a second formulary weight-management alternative is documented, with outcome or reason for discontinuation.',
    quote: 'Phentermine 37.5 mg tablets, quantity 30, filled 02/03/2025; no refills on record.',
    source: 'Pharmacy fill history, Aug 12, 2026',
    rejected: true,
    status: { label: 'Missing', tone: 'danger' },
    outcome:
      'A fill is not a trial. Nothing says how she responded or why it stopped, so staff rejected the excerpt and Nora opened a task for the ordering clinician.',
  },
];

export function WorkedExample() {
  return (
    <section aria-labelledby="example-heading" className="pb-16">
      <div className="mb-6 max-w-2xl">
        <h2 id="example-heading" className="font-serif text-3xl sm:text-4xl leading-tight mb-2">
          One request, three criteria
        </h2>
        <p className="text-muted-foreground">
          A synthetic patient, a request for Wegovy, and the criteria her plan applies. Nora quotes the chart for each
          one. A person decides whether the quote is enough.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="hidden md:grid grid-cols-[1fr_1.2fr_1fr] gap-6 border-b border-border px-6 py-3 text-xs uppercase tracking-[0.08em] text-muted-foreground">
          <p>The payer asks</p>
          <p>The chart says</p>
          <p>What happens</p>
        </div>
        <ol className="divide-y divide-border">
          {ROWS.map((row) => (
            <li key={row.criterion} className="grid gap-4 px-6 py-6 md:grid-cols-[1fr_1.2fr_1fr] md:gap-6">
              <p className="text-sm leading-relaxed">
                <span className="md:hidden block text-xs uppercase tracking-[0.08em] text-muted-foreground mb-1">The payer asks</span>
                {row.criterion}
              </p>
              <figure>
                <blockquote
                  className={`border-l-2 pl-3 text-sm leading-relaxed ${row.rejected ? 'border-red-300 text-muted-foreground line-through' : 'border-emerald-400'}`}
                >
                  {row.quote}
                </blockquote>
                <figcaption className="mt-2 pl-3 text-xs text-muted-foreground">
                  {row.source}
                  {row.rejected && ' · rejected by staff'}
                </figcaption>
              </figure>
              <div>
                <Pill tone={row.status.tone}>{row.status.label}</Pill>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{row.outcome}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        This is a request in the demo practice, not a mock-up of one.{' '}
        <Link href="/demo" className="font-medium text-foreground underline underline-offset-4">
          Open it
        </Link>{' '}
        to see the other four criteria, the note it came from, and the timeline. The criteria are illustrative, not any
        payer&apos;s published policy.
      </p>
    </section>
  );
}
