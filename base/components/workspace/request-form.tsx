'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCalendarDate, formatDateTime } from '@/lib/format';
import { ANSWER_LABELS, ANSWER_TONES, ORIGIN_LABELS, ORIGIN_TONES } from '@/lib/prior-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  if (source.kind === 'staff') {
    return (
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-body">{source.origin === 'override' ? 'Changed' : 'Entered'} by {source.recorded_by ?? 'staff'}</span>
        {source.recorded_at ? `, ${formatDateTime(source.recorded_at)}` : ''}
        {source.replaces ? ` · Nora had “${source.replaces}”` : ''}
        {source.note && <span className="mt-0.5 block text-body">{source.note}</span>}
      </p>
    );
  }
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

export type RecordAnswer = (answer: { link_id: string; codes?: string[]; value?: string; note?: string }) => Promise<void>;

/**
 * Where staff record what the prescriber's office answered, or correct
 * Nora's answer. Saved on the request, marked as theirs, and kept with the
 * final check.
 */
function AnswerEditor({ question, onRecord, onDone }: { question: FormQuestion; onRecord: RecordAnswer; onDone: () => void }) {
  const multiple = question.repeats;
  const [codes, setCodes] = useState<string[]>(question.answer?.codes ?? []);
  const [value, setValue] = useState(question.type === 'integer' ? question.answer?.display ?? '' : '');
  const [note, setNote] = useState(question.source?.kind === 'staff' ? question.source.note ?? '' : '');
  const [busy, setBusy] = useState(false);

  const toggle = (code: string) =>
    setCodes((current) => (multiple ? (current.includes(code) ? current.filter((c) => c !== code) : [...current, code]) : [code]));

  const save = async (clear = false) => {
    setBusy(true);
    try {
      await onRecord(clear ? { link_id: question.link_id } : { link_id: question.link_id, codes, value: value || undefined, note: note || undefined });
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not record the answer');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-input bg-white p-3" data-answer-editor>
      {question.type === 'integer' ? (
        <Input type="number" min={0} inputMode="numeric" aria-label="Answer" value={value} onChange={(e) => setValue(e.target.value)} className="w-32" />
      ) : (
        <fieldset className="space-y-1.5">
          <legend className="sr-only">Answer</legend>
          {question.options.map((option) => (
            <label key={option.code} className="flex items-start gap-2.5 text-sm text-ink">
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={`answer-${question.link_id}`}
                className="mt-1 size-4 accent-[#171717]"
                checked={codes.includes(option.code)}
                onChange={() => toggle(option.code)}
              />
              {option.display}
            </label>
          ))}
        </fieldset>
      )}
      <Input className="mt-3" placeholder="Where the answer came from (optional), e.g. office replied by fax" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || (question.type === 'integer' ? !value : codes.length === 0)} onClick={() => save()}>Save answer</Button>
        {question.source?.kind === 'staff' && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => save(true)}>
            {question.origin === 'override' ? "Go back to Nora's answer" : 'Clear'}
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={busy} onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

/** One of the plan's questions: Nora's answer with its source, or why a person has to answer it. */
export function QuestionCard({ question, onRecord }: { question: FormQuestion; onRecord?: RecordAnswer }) {
  const [editing, setEditing] = useState(false);
  const pill = question.origin && question.origin !== 'auto'
    ? <Pill tone={ORIGIN_TONES[question.origin]}>{ORIGIN_LABELS[question.origin]}</Pill>
    : <Pill tone={ANSWER_TONES[question.status]}>{ANSWER_LABELS[question.status]}</Pill>;
  return (
    <Card className="px-4 py-4" data-question={question.link_id} data-status={question.status}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-ink">
          {question.prefix && <span className="mr-1 font-medium tabular-nums text-muted-foreground">{question.prefix}</span>}
          {question.text}
        </p>
        {pill}
      </div>
      {question.depends_on.length > 0 && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Only if the plan asks it: it depends on {question.depends_on.map((d) => `“${d}”`).join(' and ')}, which the chart does not answer.
        </p>
      )}
      {!editing && <Choices question={question} />}
      {editing && onRecord ? (
        <AnswerEditor question={question} onRecord={onRecord} onDone={() => setEditing(false)} />
      ) : question.status === 'answered' ? (
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
      {onRecord && !editing && (
        <Button size="sm" variant={question.status === 'answered' ? 'ghost' : 'outline'} className="mt-3" onClick={() => setEditing(true)}>
          {question.status === 'answered' ? 'Change answer' : "Record the office's answer"}
        </Button>
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
