import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Pill } from '@/components/workspace/status-pill';
import type { Tone } from '@/lib/prior-auth';

/**
 * Three criteria from the request the demo opens on. The quotes and sources
 * are copied word for word from the demo seeds (api/db/seeds), so what a
 * visitor reads here is what they find when they open it; the criteria are
 * shortened to fit. Keep the two in step.
 */
const EXAMPLES: Array<{
  label: string;
  labelClass: string;
  criterion: string;
  quote: string;
  source: string;
  rejected?: boolean;
  status: { label: string; tone: Tone };
  outcome: string;
}> = [
  {
    label: 'Quoted from the chart',
    labelClass: 'text-blue-deep',
    criterion: 'BMI of 30 kg/m2 or greater, documented within the last 6 months.',
    quote: 'Assessment: Obesity, class I (E66.01), BMI 34.0-34.9 (Z68.34).',
    source: 'Office visit · Aug 12, 2026',
    status: { label: 'Met', tone: 'success' },
    outcome: 'A rule found the sentence. The medical assistant read it in the note and verified it.',
  },
  {
    label: 'Verified by a person',
    labelClass: 'text-green-deep',
    criterion: 'A trial of one other weight-management medication, with its outcome or the reason it was stopped.',
    quote: 'Previously tried Saxenda (liraglutide) from 2025-06 to 2025-10; discontinued due to persistent nausea and vomiting.',
    source: 'Office visit · Aug 12, 2026',
    status: { label: 'Met', tone: 'success' },
    outcome: 'The note names the drug, the dates, and why it was stopped. That is a documented trial.',
  },
  {
    label: 'Gaps, flagged',
    labelClass: 'text-orange-deep',
    criterion: 'Trial of a second formulary alternative, with outcome or reason for discontinuation.',
    quote: 'Phentermine 37.5 mg tablets, quantity 30, filled 02/03/2025; no refills on record.',
    source: 'Pharmacy fill history · Aug 12, 2026',
    rejected: true,
    status: { label: 'Missing', tone: 'danger' },
    outcome: 'A fill is not a trial. Nothing says how she responded, so staff rejected the excerpt and Nora opened a task for the clinician.',
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
              <blockquote
                className={cn(
                  'border-l-[3px] pl-3.5 text-[0.9375rem] leading-relaxed',
                  example.rejected ? 'border-input text-muted-foreground line-through' : 'border-green text-ink'
                )}
              >
                {example.quote}
              </blockquote>
              <figcaption className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
                <span>{example.source}</span>
                <Pill tone="neutral">Found by rule</Pill>
                {example.rejected ? <Pill tone="danger">Rejected</Pill> : <Pill tone="success">Verified</Pill>}
              </figcaption>
              <div className="mt-auto flex items-center gap-2 pt-4">
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-white',
                    example.rejected ? 'bg-orange' : 'bg-green'
                  )}
                  aria-hidden
                >
                  {example.rejected ? <X className="size-3.5" strokeWidth={3.5} /> : <Check className="size-3.5" strokeWidth={3.5} />}
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
