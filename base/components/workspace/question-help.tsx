'use client';

import { useState, FormEvent } from 'react';
import { askPayerQuestion } from '@/lib/api';
import { formatCalendarDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/prior-auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Panel, Card } from '@/components/workspace/page-header';
import { Notice } from '@/components/workspace/notice';
import { Pill } from '@/components/workspace/status-pill';
import { DocumentViewer } from '@/components/workspace/document-viewer';
import type { QuestionAnswer, QuestionHelp as QuestionHelpResult } from '@/types';

const ANSWERS: Record<QuestionAnswer, { label: string; tone: Tone; meaning: string }> = {
  supported: { label: 'Chart supports an answer', tone: 'success', meaning: 'At least one passage answers the question. Read it before you use it.' },
  mentioned_only: {
    label: 'Mentioned, not documented',
    tone: 'warning',
    meaning: 'The chart touches on this but does not say enough to answer. A drug that is only listed or filled is not a documented trial.',
  },
  conflicting: { label: 'Chart conflicts', tone: 'warning', meaning: 'Passages disagree. The clinician needs to settle it.' },
  not_documented: { label: 'Not documented', tone: 'danger', meaning: 'Nothing in the chart answers this. Ask the clinician to document it.' },
};

type Finding = QuestionHelpResult['findings'][number];

/**
 * "Help me with this question": staff paste one question from the payer's
 * form and get it in plain words, with what the chart says about it. Nothing
 * here is saved or added to the request.
 */
export function QuestionHelp({ priorAuthorizationId, suggestion }: {
  priorAuthorizationId: number;
  /** A question to offer as a one-click start, e.g. the selected criterion. */
  suggestion?: string;
}) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<QuestionHelpResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<Finding | null>(null);

  const ask = async (text: string) => {
    setBusy(true);
    setError('');
    try {
      setResult(await askPayerQuestion(priorAuthorizationId, text));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Could not get help with that question');
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (question.trim()) void ask(question);
  };

  return (
    <Panel title="Help with a payer question">
      <form onSubmit={submit} className="space-y-3">
        <Label htmlFor="payer-question">Paste a question from the payer&apos;s form</Label>
        <Textarea
          id="payer-question"
          rows={2}
          maxLength={2000}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Has the patient had an inadequate response to, or intolerance of, a formulary alternative?"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" disabled={busy || !question.trim()}>
            {busy ? 'Reading the chart…' : 'Explain and check the chart'}
          </Button>
          {suggestion && (
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => { setQuestion(suggestion); void ask(suggestion); }}>
              Use the selected criterion
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Nora explains the wording and quotes the chart. It does not decide medical necessity, and nothing here is saved.
        </p>
      </form>

      {error && <Notice tone="danger" role="alert" className="mt-4">{error}</Notice>}

      {result && (
        <div className="mt-5 space-y-5" aria-live="polite">
          <div>
            <h3 className="mb-1.5 font-sans text-sm font-semibold tracking-normal text-ink">In plain words</h3>
            <p className="text-[0.9375rem] leading-relaxed text-body">{result.plain_language}</p>
          </div>

          {result.what_counts.length > 0 && (
            <div>
              <h3 className="mb-1.5 font-sans text-sm font-semibold tracking-normal text-ink">What would count</h3>
              <ul className="list-disc space-y-1 pl-5 text-[0.9375rem] text-body">
                {result.what_counts.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="font-sans text-sm font-semibold tracking-normal text-ink">What the chart says</h3>
              <Pill tone={ANSWERS[result.answer].tone}>{ANSWERS[result.answer].label}</Pill>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{ANSWERS[result.answer].meaning}</p>
            {result.findings.length > 0 ? (
              <ul className="space-y-2">
                {result.findings.map((finding) => (
                  <li key={`${finding.document.id}-${finding.start_offset}`}>
                    <Card className="p-4">
                      <blockquote className={cn('border-l-[3px] pl-3.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-ink', finding.supports ? 'border-green' : 'border-yellow')}>
                        {finding.excerpt}
                      </blockquote>
                      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
                        <span>
                          {finding.document.title}
                          {finding.document.occurred_on ? `, ${formatCalendarDate(finding.document.occurred_on)}` : ''}
                        </span>
                        <Pill tone={finding.supports ? 'success' : 'warning'}>{finding.supports ? 'Answers the question' : 'Related, not enough'}</Pill>
                      </div>
                      {finding.note && <p className="mt-2 text-xs text-muted-foreground">{finding.note}</p>}
                      <Button size="sm" variant="secondary" className="mt-3" onClick={() => setViewing(finding)}>View in document</Button>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-input bg-white/60 p-4 text-sm text-muted-foreground">
                No passage in the chart bears on this question.
              </p>
            )}
            {result.discarded_quotes > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {result.discarded_quotes} quote{result.discarded_quotes === 1 ? '' : 's'} from the model could not be found in the chart and
                {result.discarded_quotes === 1 ? ' was' : ' were'} discarded.
              </p>
            )}
            {result.chart_truncated && (
              <p className="mt-2 text-xs text-yellow-deep">The chart is long; only the first part was read.</p>
            )}
          </div>

          {result.suggested_answer && (
            <Notice tone="success">
              <span className="font-medium">A possible answer, for you to check: </span>
              {result.suggested_answer}
            </Notice>
          )}
          {result.ask_clinician && (
            <Notice tone="warning">
              <span className="font-medium">To ask the clinician: </span>
              {result.ask_clinician}
            </Notice>
          )}
        </div>
      )}

      <DocumentViewer
        documentId={viewing?.document.id ?? null}
        highlights={viewing ? [[viewing.start_offset, viewing.end_offset]] : []}
        onClose={() => setViewing(null)}
      />
    </Panel>
  );
}
