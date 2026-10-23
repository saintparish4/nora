'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCalendarDate, formatDateTime } from '@/lib/format';
import { ANSWER_LABELS, ANSWER_TONES } from '@/lib/prior-auth';
import { Button } from '@/components/ui/button';
import { Card, Panel } from '@/components/workspace/page-header';
import { Notice } from '@/components/workspace/notice';
import { Pill } from '@/components/workspace/status-pill';
import type { FormField, FormQuestion, QuestionSet } from '@/types';

export const SECTIONS: { key: FormField['section']; title: string }[] = [
  { key: 'patient', title: 'Patient' },
  { key: 'insurance', title: 'Insurance' },
  { key: 'prescriber', title: 'Prescriber' },
  { key: 'medication', title: 'Medication' },
  { key: 'diagnosis', title: 'Diagnosis' },
];

/** Copies one value to paste into CoverMyMeds. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy. Select the text and copy it instead.');
    }
  };
  return (
    <Button type="button" size="icon-sm" variant="ghost" onClick={copy} aria-label={`Copy ${label}`} className="shrink-0">
      {copied ? <Check aria-hidden className="size-4 text-green-deep" /> : <Copy aria-hidden className="size-4 text-muted-foreground" />}
    </Button>
  );
}

function SourceLine({ inEpic, element, detail }: { inEpic: string; element: string; detail?: string | null }) {
  return (
    <p className="mt-1 text-xs leading-relaxed break-words text-muted-foreground">
      <span className="font-medium text-body">{inEpic}</span>
      {detail ? ` · ${detail}` : ''} · {/* Breaks only after a dot, so a path wraps as Coverage.class / (rxbin), not mid-word. */}
      <span className="font-mono text-[0.6875rem]">{element.replaceAll('.', '.\u200b')}</span>
    </p>
  );
}

/** One CoverMyMeds section: label, the value to paste, and where it came from. */
export function FieldSection({ title, fields }: { title: string; fields: FormField[] }) {
  return (
    <Panel title={title} tour={`form-${title.toLowerCase()}`}>
      <Card className="divide-y divide-border">
        {fields.map((field) => (
          <div key={field.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)_auto]" data-field={field.key}>
            <div className="col-span-2 pt-0.5 text-sm text-muted-foreground sm:col-span-1">{field.label}</div>
            <div className="min-w-0 flex-1">
              {field.value ? (
                <>
                  <p className="text-sm break-words text-ink">{field.value}</p>
                  {field.source && <SourceLine inEpic={field.source.in_epic} element={field.source.element} />}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Not in the chart</p>
                  {field.missing && <p className="mt-1 text-xs leading-relaxed text-orange-deep">{field.missing}</p>}
                </>
              )}
            </div>
            {field.value && <CopyButton value={field.value} label={field.label} />}
          </div>
        ))}
      </Card>
    </Panel>
  );
}

export function QuestionSetHeader({ set }: { set: QuestionSet }) {
  return (
    <Notice tone={set.kind === 'form' ? 'neutral' : 'warning'} className="mb-4">
      {set.kind === 'form' ? (
        <>
          <span className="font-medium">The plan&apos;s own form, word for word:</span> {set.source_title}
          {set.revised ? `, revised ${formatCalendarDate(set.revised)}` : ''}. CoverMyMeds should ask the same questions in this order.
          {set.note && <> {set.note}</>}
        </>
      ) : (
        <>
          <span className="font-medium">Derived from the plan&apos;s criteria, in Nora&apos;s words.</span> {set.publisher} sends its own
          questions through CoverMyMeds, where Nora cannot see them. Match each one there to the question below that asks the same thing.
        </>
      )}
      {set.source_url && (
        <>
          {' '}
          <a href={set.source_url} target="_blank" rel="noopener noreferrer" className="font-medium underline">
            {set.kind === 'form' ? 'Open the form' : 'Read the policy'}
          </a>
        </>
      )}
    </Notice>
  );
}

/** How the plan's form shows the choices, with Nora's answer marked. */
function Choices({ question }: { question: FormQuestion }) {
  const chosen = new Set(question.answer?.codes ?? []);
  if (question.type === 'integer') {
    return (
      <div className="mt-3 inline-flex min-w-24 rounded-xl border border-input bg-white px-3 py-1.5 text-sm tabular-nums text-ink">
        {question.answer?.display ?? ' '}
      </div>
    );
  }
  return (
    <ul className="mt-3 space-y-1.5">
      {question.options.map((option) => {
        const on = chosen.has(option.code);
        return (
          <li key={option.code} className={cn('flex items-start gap-2.5 text-sm', on ? 'font-medium text-ink' : 'text-muted-foreground')}>
            <span
              aria-hidden
              className={cn(
                'mt-[3px] grid size-3.5 shrink-0 place-items-center border',
                chosen.size > 1 ? 'rounded-[3px]' : 'rounded-full',
                on ? 'border-ink bg-ink' : 'border-[#b9b4ac] bg-white'
              )}
            >
              {on && <span className="size-1.5 rounded-full bg-white" />}
            </span>
            {on && <span className="sr-only">Selected: </span>}
            {option.display}
          </li>
        );
      })}
    </ul>
  );
}

function QuestionSource({ question }: { question: FormQuestion }) {
  const source = question.source;
  if (!source) return null;
  if (source.kind === 'chart') return <SourceLine inEpic={source.in_epic} element={source.element} detail={source.detail} />;
  return (
    <div className="mt-3 space-y-2">
      {source.quotes.map((quote, i) => (
        <figure key={i} className="rounded-xl bg-tile px-3 py-2">
          <blockquote className="text-sm leading-relaxed text-ink">&ldquo;{quote.excerpt}&rdquo;</blockquote>
          <figcaption className="mt-1 text-xs text-muted-foreground">
            {quote.document}
            {quote.occurred_on ? `, ${formatCalendarDate(quote.occurred_on)}` : ''}
            {quote.verified_by ? ` · verified by ${quote.verified_by}` : ''}
            {quote.verified_at ? ` ${formatDateTime(quote.verified_at)}` : ''}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/** One of the plan's questions: Nora's answer with its source, or why a person has to answer it. */
export function QuestionCard({ question }: { question: FormQuestion }) {
  return (
    <Card className="px-4 py-4" data-question={question.link_id} data-status={question.status}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-ink">
          {question.prefix && <span className="mr-1 font-medium tabular-nums text-muted-foreground">{question.prefix}</span>}
          {question.text}
        </p>
        <Pill tone={ANSWER_TONES[question.status]}>{ANSWER_LABELS[question.status]}</Pill>
      </div>
      {question.depends_on.length > 0 && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Only if the plan asks it: it depends on {question.depends_on.map((d) => `“${d}”`).join(' and ')}, which the chart does not answer.
        </p>
      )}
      <Choices question={question} />
      {question.status === 'answered' ? (
        <div className="mt-2 flex items-start gap-2">
          <div className="min-w-0 flex-1"><QuestionSource question={question} /></div>
          {question.answer && <CopyButton value={question.answer.display} label="answer" />}
        </div>
      ) : (
        <Notice tone={question.status === 'ask_prescriber' ? 'warning' : 'info'} className="mt-3">
          {question.plain && <p><span className="font-medium">In plain words:</span> {question.plain}</p>}
          {question.reason && <p className={question.plain ? 'mt-1.5' : undefined}>{question.reason}</p>}
        </Notice>
      )}
      {question.status === 'answered' && question.plain && (
        <details className="mt-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">What this question means</summary>
          <p className="mt-1 leading-relaxed">{question.plain}</p>
        </details>
      )}
    </Card>
  );
}
