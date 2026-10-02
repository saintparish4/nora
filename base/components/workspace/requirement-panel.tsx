'use client';

import { useState, FormEvent } from 'react';
import { toast } from 'sonner';
import { addEvidence, reviewEvidence, reviewRequirement } from '@/lib/api';
import { EXTRACTED_BY_LABELS, metBlocker, sortEvidence } from '@/lib/prior-auth';
import { formatCalendarDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { cn } from '@/lib/utils';
import { Pill, RequirementStatusPill } from '@/components/workspace/status-pill';
import type { ChartDocument, Evidence, PriorAuthorizationDetail, Requirement, RequirementStatus } from '@/types';

type Update = (pa: PriorAuthorizationDetail) => void;

async function run(action: () => Promise<PriorAuthorizationDetail>, onUpdate: Update, success?: string) {
  try {
    onUpdate(await action());
    if (success) toast.success(success);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Something went wrong');
  }
}

/** One requirement: its criterion, the evidence behind it, and the decision. */
export function RequirementPanel({
  requirement,
  editable,
  documents,
  onUpdate,
  onViewEvidence,
}: {
  requirement: Requirement;
  editable: boolean;
  documents: ChartDocument[];
  onUpdate: Update;
  onViewEvidence: (evidence: Evidence) => void;
}) {
  const [note, setNote] = useState(requirement.note ?? '');
  const [busy, setBusy] = useState(false);
  const evidence = sortEvidence(requirement.evidence);
  const blocker = metBlocker(requirement);

  const decide = async (status: RequirementStatus) => {
    if (status === 'not_applicable' && !note.trim()) {
      toast.error('Add a note explaining why this does not apply.');
      return;
    }
    setBusy(true);
    await run(() => reviewRequirement(requirement.id, status, note), onUpdate);
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <RequirementStatusPill status={requirement.status} />
          {requirement.criterion.optional && <Pill tone="neutral">Conditional</Pill>}
          <span className="text-xs text-muted-foreground">Criterion {requirement.criterion.position}</span>
        </div>
        <p className="font-display text-[1.375rem] leading-[1.25] font-medium tracking-[-0.025em] text-ink">{requirement.criterion.text}</p>
        {requirement.ai_summary && (
          <p className="mt-3 text-sm leading-relaxed text-body">
            <span className="font-medium text-purple-deep">Model&apos;s note:</span> {requirement.ai_summary}
          </p>
        )}
        {requirement.reviewed_by && requirement.reviewed_at && (
          <p className="mt-2 text-xs text-muted-foreground">
            Last reviewed by {requirement.reviewed_by.name} on {formatCalendarDate(requirement.reviewed_at)}
          </p>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-sans text-sm font-semibold tracking-normal text-ink">Evidence ({evidence.filter((e) => !e.rejected).length})</h3>
        {evidence.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-input bg-white/60 p-5 text-sm leading-relaxed text-muted-foreground">
            Nothing found in the chart for this criterion. Add a quote below, or mark it missing so the clinician is asked
            to document it.
          </p>
        ) : (
          <ul className="space-y-3">
            {evidence.map((ev) => (
              <EvidenceCard key={ev.id} evidence={ev} editable={editable} onUpdate={onUpdate} onView={() => onViewEvidence(ev)} />
            ))}
          </ul>
        )}
      </div>

      {editable && (
        <>
          <div className="space-y-2">
            <Label htmlFor={`note-${requirement.id}`}>Note (required for not applicable)</Label>
            <Textarea id={`note-${requirement.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || blocker !== null} title={blocker ?? undefined} onClick={() => decide('met')}>
              Mark met
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => decide('missing')}>Missing</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => decide('unclear')}>Unclear</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => decide('not_applicable')}>Not applicable</Button>
            {requirement.status !== 'pending' && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => decide('pending')}>Back to review</Button>
            )}
          </div>
          {blocker && requirement.status !== 'met' && <p className="text-xs text-muted-foreground">{blocker}</p>}
          <AddEvidenceForm requirementId={requirement.id} documents={documents} onUpdate={onUpdate} />
        </>
      )}
    </div>
  );
}

function EvidenceCard({ evidence, editable, onUpdate, onView }: {
  evidence: Evidence;
  editable: boolean;
  onUpdate: Update;
  onView: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const review = async (action: 'verify' | 'reject') => {
    setBusy(true);
    await run(() => reviewEvidence(evidence.id, action), onUpdate);
    setBusy(false);
  };

  return (
    <li className={cn('rounded-2xl border bg-white p-4', evidence.verified ? 'border-green/50' : 'border-border')}>
      <blockquote
        className={cn(
          'border-l-[3px] pl-3.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap',
          evidence.rejected ? 'border-input text-muted-foreground line-through' : evidence.verified ? 'border-green text-ink' : 'border-blue text-ink'
        )}
      >
        {evidence.excerpt}
      </blockquote>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
        <span>
          {evidence.document.title}
          {evidence.document.occurred_on ? `, ${formatCalendarDate(evidence.document.occurred_on)}` : ''}
        </span>
        <Pill tone="neutral">{EXTRACTED_BY_LABELS[evidence.extracted_by]}</Pill>
        {evidence.confidence != null && evidence.extracted_by !== 'human' && <span>{Math.round(evidence.confidence * 100)}% match</span>}
        {evidence.verified && <Pill tone="success">Verified{evidence.verified_by ? ` by ${evidence.verified_by.name}` : ''}</Pill>}
        {evidence.rejected && <Pill tone="danger">Rejected</Pill>}
      </div>
      {evidence.rationale && <p className="mt-2 text-xs text-muted-foreground">{evidence.rationale}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onView}>View in document</Button>
        {editable && !evidence.verified && (
          <Button size="sm" variant={evidence.rejected ? 'outline' : 'default'} disabled={busy} onClick={() => review('verify')}>
            {evidence.rejected ? 'Restore and verify' : 'Verify'}
          </Button>
        )}
        {editable && !evidence.rejected && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => review('reject')}>Reject</Button>
        )}
      </div>
    </li>
  );
}

function AddEvidenceForm({ requirementId, documents, onUpdate }: {
  requirementId: number;
  documents: ChartDocument[];
  onUpdate: Update;
}) {
  const [open, setOpen] = useState(false);
  const [documentId, setDocumentId] = useState('');
  const [quote, setQuote] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} disabled={documents.length === 0}>
        + Cite chart text yourself
      </Button>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await run(() => addEvidence(requirementId, Number(documentId), quote), (pa) => {
      onUpdate(pa);
      setQuote('');
      setOpen(false);
    }, 'Evidence added');
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-white p-4">
      <div className="space-y-2">
        <Label htmlFor={`doc-${requirementId}`}>Document</Label>
        <NativeSelect id={`doc-${requirementId}`} required value={documentId} onChange={(e) => setDocumentId(e.target.value)}>
          <option value="">Choose a document</option>
          {documents.map((d) => <option key={d.id} value={d.id}>{d.title}{d.occurred_on ? ` (${formatCalendarDate(d.occurred_on)})` : ''}</option>)}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`quote-${requirementId}`}>Exact text from the document</Label>
        <Textarea id={`quote-${requirementId}`} required rows={3} value={quote} onChange={(e) => setQuote(e.target.value)} />
        <p className="text-xs text-muted-foreground">Nora checks the text appears in the document word for word.</p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>{busy ? 'Adding…' : 'Add evidence'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
