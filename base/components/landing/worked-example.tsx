import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Pill } from '@/components/workspace/status-pill';
import type { Tone } from '@/lib/prior-auth';

/**
 * Three of Cigna's criteria from the request the demo opens on. The quotes and
 * sources are copied word for word from the demo seeds (api/db/seeds), so what
 * a visitor reads here is what they find when they open it; the criteria are
 * shortened from db/seeds/policy_library.rb to fit. Keep the three in step.
 */
const EXAMPLES: Array<{
  label: string;
  labelClass: string;
  criterion: string;
  /** The chart text Nora proposed, or null when it proposed nothing. */
  quote: string | null;
  source: string;
  status: { label: string; tone: Tone };
  outcome: string;
}> = [
  {
    label: 'Quoted from the chart',
    labelClass: 'text-blue-deep',
    criterion: 'Behavioral modification and dietary restriction for at least 3 months.',
    quote: 'She has followed a reduced-calorie diet with our dietitian since January 2026 and walks 30 minutes five days a week.',
    source: 'Office visit · Aug 12, 2026',
    status: { label: 'Met', tone: 'success' },
    outcome: 'A rule found the sentence and its start date. The medical assistant read it in the note and verified it.',
  },
  {
    label: 'Read the way the payer reads it',
    labelClass: 'text-green-deep',
    criterion: 'Baseline BMI of 30 or greater, measured before any GLP-1 drug.',
    quote: 'BMI 34.2.',
    source: 'Office visit · Aug 12, 2026',
    status: { label: 'Missing', tone: 'danger' },
    outcome: 'The BMI is high enough, but she took Saxenda in 2025 and this reading is from after it. Staff left it unverified and asked for the earlier one.',
  },
  {
    label: 'Gaps, flagged',
    labelClass: 'text-orange-deep',
    criterion: 'Not used together with another GLP-1 drug.',
    quote: null,
    source: 'Her medication list shows no GLP-1, but no sentence says she takes none, so Nora offers nothing.',
    status: { label: 'Missing', tone: 'danger' },
    outcome: 'A list is not a statement. Staff marked the requirement missing and Nora opened a task for the clinician.',
  },
];

export function WorkedExample() {
  return (
    // Each example spans three shared rows (tile, label, outcome), so the labels
    // line up across the row however long each quote runs.
    <ol className="grid gap-x-5 gap-y-10 lg:grid-cols-3 lg:gap-y-0">
      {EXAMPLES.map((example, i) => (
        <li key={example.label} className="row-span-3 grid grid-rows-subgrid gap-y-0">
          <div className="flex flex-col rounded-[2rem] bg-tile p-4 sm:p-5">
            {/* The payer's question */}
            <p className="px-2 pt-1 pb-4 text-[0.9375rem] leading-relaxed text-body">
              <span className="mb-1 block text-xs font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                Criterion {[1, 5, 7][i]} · the payer asks
              </span>
              {example.criterion}
            </p>

            {/* The chart's answer, as Nora shows it */}
            <figure className="flex flex-1 flex-col rounded-2xl border border-border bg-white p-4">
              {example.quote ? (
                <>
                  <blockquote className="border-l-[3px] border-green pl-3.5 text-[0.9375rem] leading-relaxed text-ink">{example.quote}</blockquote>
                  <figcaption className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
                    <span>{example.source}</span>
                    <Pill tone="neutral">Found by rule</Pill>
                    <Pill tone="success">Verified</Pill>
                  </figcaption>
                </>
              ) : (
                <figcaption className="rounded-xl border border-dashed border-input p-3.5 text-sm leading-relaxed text-muted-foreground">
                  <span className="mb-1 block font-medium text-ink">Nothing proposed</span>
                  {example.source}
                </figcaption>
              )}
              <div className="mt-auto flex items-center gap-2 pt-4">
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-white',
                    example.quote ? 'bg-green' : 'bg-orange'
                  )}
                  aria-hidden
                >
                  {!example.quote ? <X className="size-3.5" strokeWidth={3.5} /> : <Check className="size-3.5" strokeWidth={3.5} />}
                </span>
                <span className="text-sm font-medium text-ink">Requirement {example.status.label.toLowerCase()}</span>
              </div>
            </figure>
          </div>

          <p className={cn('mt-4 px-2 text-[0.9375rem] font-semibold', example.labelClass)}>{example.label}</p>
          <p className="mt-1 px-2 text-[0.9375rem] leading-relaxed text-body">{example.outcome}</p>
        </li>
      ))}
    </ol>
  );
}
