'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { usePriorAuthorization, useRequestForm } from '@/lib/api';
import { notesToAttach, prescriberMessage } from '@/lib/prior-auth';
import { formatCalendarDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, ErrorNote, PageHeader, Panel } from '@/components/workspace/page-header';
import { Notice } from '@/components/workspace/notice';
import { CopyButton, FieldSection, QuestionCard, QuestionSetHeader, SECTIONS } from '@/components/workspace/request-form';

/**
 * The request as staff fill it on CoverMyMeds: every field and every one of
 * the plan's questions, in order, ready to paste, each with where it came
 * from. Nora does not send anything; staff type or paste it in.
 */
export default function RequestFormPage() {
  const params = useParams<{ id: string }>();
  const id = Number.isFinite(Number(params.id)) ? Number(params.id) : null;
  const { data: pa, error: paError } = usePriorAuthorization(id);
  const { data: form, error } = useRequestForm(id);

  if (paError || error) return <ErrorNote error={paError ?? error} />;
  if (!pa || !form) {
    return (
      <div className="space-y-6" aria-busy>
        <Skeleton className="h-20 rounded-tile" />
        <Skeleton className="h-64 rounded-tile" />
      </div>
    );
  }

  const back = { href: `/dashboard/prior-authorizations/${pa.id}`, label: 'Back to the request' };
  const header = (
    <PageHeader
      back={back}
      title={<>Request form · {pa.patient.full_name}</>}
      subtitle={<>{pa.item_name} · {pa.coverage.payer.name}. Fill CoverMyMeds from this page, top to bottom.</>}
    />
  );

  if (!form.available) {
    return (
      <div>
        {header}
        <Notice tone="warning">{form.reason} Fill the request from the chart in Epic as usual.</Notice>
      </div>
    );
  }

  const questions = form.questions.available ? form.questions.items : [];
  const visible = questions.filter((q) => !q.hidden);
  const facts = questions.filter((q) => q.hidden);
  const filled = form.fields.filter((f) => f.value).length;
  const answered = visible.filter((q) => q.status === 'answered').length;
  const asks = visible.filter((q) => q.status === 'ask_prescriber');
  const notes = notesToAttach(pa);
  const message = prescriberMessage(visible, { patient: pa.patient.full_name, item: pa.item_name, payer: pa.coverage.payer.name });

  return (
    <div>
      {header}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <FieldSection key={section.key} title={section.title} fields={form.fields.filter((f) => f.section === section.key)} />
          ))}

          <Panel title="The plan's questions" tour="form-questions">
            {form.questions.available ? (
              <>
                <QuestionSetHeader set={form.questions.set} />
                {facts.length > 0 && (
                  <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                    Which questions apply depends on:{' '}
                    {facts.map((f) => `${f.text}: ${f.answer?.display ?? 'not in the chart'}`).join(' · ')}.
                  </p>
                )}
                <div className="space-y-3">
                  {visible.map((q) => <QuestionCard key={q.link_id} question={q} />)}
                </div>
              </>
            ) : (
              <Notice tone="warning">{form.questions.reason}</Notice>
            )}
          </Panel>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Panel title="What Nora filled" tour="form-progress">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Fields</dt><dd className="text-ink tabular-nums">{filled} of {form.fields.length}</dd></div>
              <div><dt className="text-muted-foreground">Questions</dt><dd className="text-ink tabular-nums">{answered} of {visible.length}</dd></div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Read from {form.chart_source} for patient {form.patient_fhir_id}. Nothing here is sent to the plan: you check each value
              and enter it in CoverMyMeds.
            </p>
          </Panel>

          <Panel title="Ask the prescriber's office" tour="form-ask">
            {asks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing to ask: the chart answers every question that applies.</p>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-body">
                  {asks.length} question{asks.length === 1 ? '' : 's'} the chart does not answer. Copy them into a staff message or a fax to
                  the office; you can keep filling the rest meanwhile.
                </p>
                <Card className="mt-3 flex items-start gap-2 p-3">
                  <pre className="min-w-0 flex-1 font-sans text-xs leading-relaxed whitespace-pre-wrap text-body">{message}</pre>
                  <CopyButton value={message} label="questions for the office" />
                </Card>
              </>
            )}
          </Panel>

          <Panel title="Chart notes to attach" tour="form-notes">
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No verified evidence yet. Notes appear here once a quote from them is verified.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {notes.map((note) => (
                  <li key={note.id} className="text-ink">
                    {note.title}
                    {note.occurred_on && <span className="text-muted-foreground"> · {formatCalendarDate(note.occurred_on)}</span>}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Plans ask for chart notes. These are the notes behind the verified quotes; find them under Encounters in Epic.
            </p>
          </Panel>

          <Button asChild variant="secondary" className="w-full">
            <Link href={back.href}>Back to the request</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
