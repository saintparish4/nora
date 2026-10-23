'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/context';
import {
  submitPriorAuthorization,
  downloadPacket,
  startExtraction,
  transitionPriorAuthorization,
  updatePriorAuthorization,
  useMembers,
  usePatient,
  usePriorAuthorization,
  usePriorAuthorizationEvents,
  useTasks,
  type PaStatus,
  type PriorAuthorizationDetail,
  type Evidence,
  type Role,
  type WorkflowEvent,
} from '@/lib/api';
import {
  submitBlocker,
  describeEvent,
  isEditable,
  packetAvailable,
  TRANSITION_LABELS,
} from '@/lib/prior-auth';
import { formatCalendarDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader, Panel, ErrorNote } from '@/components/workspace/page-header';
import { Notice } from '@/components/workspace/notice';
import { NativeSelect } from '@/components/ui/native-select';
import { PaStatusPill, RequirementStatusPill } from '@/components/workspace/status-pill';
import { RequirementPanel } from '@/components/workspace/requirement-panel';
import { QuestionHelp } from '@/components/workspace/question-help';
import { DocumentViewer } from '@/components/workspace/document-viewer';
import { TaskList } from '@/components/workspace/task-list';
import { Skeleton } from '@/components/ui/skeleton';
import { RequestSkeleton } from '@/components/workspace/screen-skeletons';

export default function PriorAuthorizationPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { user } = useAuth();
  const known = Number.isFinite(id) ? id : null;
  // Everything keyed by the id in the URL starts at once; only the patient
  // has to wait for the request to say who it is.
  const { data: pa, error, isLoading, mutate } = usePriorAuthorization(known);
  const { data: patient } = usePatient(pa?.patient.id ?? null);
  const { data: events, mutate: mutateEvents } = usePriorAuthorizationEvents(known);
  const { data: tasks, mutate: mutateTasks } = useTasks(known ? { prior_authorization_id: known, status: 'open' } : null);
  useMembers(); // for the assignment panel, which would otherwise ask only once the request is drawn
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Evidence | null>(null);

  // A change to the request (a transition, an approval, extraction finishing)
  // adds events and can open or close tasks.
  const version = pa?.updated_at;
  const seenVersion = useRef(version);
  useEffect(() => {
    if (!version) return;
    if (seenVersion.current && seenVersion.current !== version) {
      void mutateEvents();
      void mutateTasks();
    }
    seenVersion.current = version;
  }, [version, mutateEvents, mutateTasks]);

  if (isLoading) return <RequestSkeleton />;
  if (error || !pa) return <ErrorNote error={error ?? new Error('Prior authorization not found')} />;

  // Reviewing a requirement or an excerpt records an event, and can open or
  // close a task, without changing the request's updated_at, so the effect
  // above would not notice. Every edit made here refreshes both.
  const update = (next: PriorAuthorizationDetail) => {
    void mutate(next, { revalidate: false });
    void mutateEvents();
    void mutateTasks();
  };
  const editable = isEditable(pa.status);
  const selected = pa.requirements.find((r) => r.id === selectedId) ?? pa.requirements.find((r) => r.status !== 'met' && r.status !== 'not_applicable') ?? pa.requirements[0];
  const documents = patient?.chart_documents ?? [];

  return (
    <div>
      <PageHeader
        back={{ href: '/dashboard/prior-authorizations', label: 'Prior authorizations' }}
        title={<>{pa.patient.full_name} · {pa.item_name}</>}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <PaStatusPill status={pa.status} />
            <span>{pa.coverage.payer.name} · {pa.coverage.plan.name} · Member {pa.coverage.member_id}</span>
            <span aria-hidden>·</span>
            <span>Ordered by {pa.requested_by.name}</span>
          </span>
        }
        actions={
          <>
            <Button asChild variant="secondary"><Link href={`/dashboard/patients/${pa.patient.id}`}>Patient chart</Link></Button>
            <Button asChild data-tour="open-form"><Link href={`/dashboard/prior-authorizations/${pa.id}/form`}>Request form</Link></Button>
          </>
        }
      />

      <ExtractionBanner pa={pa} documentCount={documents.length} onUpdate={update} />

      {(pa.policy.notes || pa.policy.source_url) && (
        <Notice tone="warning" className="mb-6">
          <span className="font-medium">{pa.policy.title}.</span> {pa.policy.notes}
          {pa.policy.source_url && (
            <>
              {' '}
              <a href={pa.policy.source_url} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                Read the policy{pa.policy.effective_on ? `, effective ${formatCalendarDate(pa.policy.effective_on)}` : ''}
              </a>
            </>
          )}
        </Notice>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[272px_minmax(0,1fr)]">
          <Panel title="Requirements" className="self-start" tour="requirements">
            <ol className="-mx-2 space-y-1">
              {pa.requirements.map((req) => (
                <li key={req.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(req.id)}
                    aria-current={selected?.id === req.id}
                    className={cn(
                      'w-full rounded-2xl border px-3 py-2.5 text-left text-sm transition-colors',
                      selected?.id === req.id ? 'border-border bg-white' : 'border-transparent hover:bg-tile-strong'
                    )}
                  >
                    <span className="line-clamp-2 text-ink">
                      <span className="text-muted-foreground tabular-nums">{req.criterion.position}.</span> {req.criterion.text}
                    </span>
                    <span className="mt-1.5 block"><RequirementStatusPill status={req.status} /></span>
                  </button>
                </li>
              ))}
            </ol>
          </Panel>

          <div className="space-y-6">
          <Panel tour="requirement">
            {selected ? (
              <RequirementPanel
                key={selected.id}
                requirement={selected}
                editable={editable}
                documents={documents}
                onUpdate={update}
                onViewEvidence={setViewing}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No requirements.</p>
            )}
          </Panel>
          <QuestionHelp priorAuthorizationId={pa.id} suggestion={selected?.criterion.text} />
          </div>
        </div>

        <div className="space-y-6">
          <SubmitPanel pa={pa} onUpdate={update} />
          <StatusPanel pa={pa} onUpdate={update} />
          <AssignmentPanel pa={pa} onUpdate={update} />
          <Panel title="Follow-up tasks" tour="tasks" busy={!tasks}>
            {!tasks ? (
              <Skeleton className="h-16 rounded-2xl" />
            ) : tasks.tasks.length > 0 ? (
              <TaskList tasks={tasks.tasks} onChange={() => mutateTasks()} />
            ) : (
              <p className="text-sm text-muted-foreground">No open tasks.</p>
            )}
          </Panel>
          <Timeline events={events} />
        </div>
      </div>

      <DocumentViewer
        documentId={viewing?.document.id ?? null}
        highlights={viewing ? [[viewing.start_offset, viewing.end_offset]] : []}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}

const TIMELINE_PREVIEW = 8;

function Timeline({ events }: { events: WorkflowEvent[] | undefined }) {
  const [expanded, setExpanded] = useState(false);
  if (!events) {
    return (
      <Panel title="Timeline" tour="timeline" busy>
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 rounded-xl" />)}
        </div>
      </Panel>
    );
  }
  const newestFirst = events.slice().reverse();
  const shown = expanded ? newestFirst : newestFirst.slice(0, TIMELINE_PREVIEW);

  return (
    <Panel title="Timeline" tour="timeline">
      <ol className="relative space-y-4 text-sm before:absolute before:top-2 before:bottom-2 before:left-[3px] before:w-px before:bg-input">
        {shown.map((ev) => (
          <li key={ev.id} className="relative pl-5">
            <span className="absolute top-[7px] left-0 size-[7px] rounded-full bg-[#b9b4ac] ring-4 ring-tile" aria-hidden />
            <p className="text-ink">{describeEvent(ev.event_type, ev.payload, ev.to_status)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(ev.created_at)}{ev.actor ? ` · ${ev.actor.name}` : ' · Nora'}</p>
          </li>
        ))}
      </ol>
      {newestFirst.length > TIMELINE_PREVIEW && (
        <Button size="sm" variant="secondary" className="mt-4" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show recent only' : `Show all ${newestFirst.length} events`}
        </Button>
      )}
    </Panel>
  );
}

function ExtractionBanner({ pa, documentCount, onUpdate }: {
  pa: PriorAuthorizationDetail;
  documentCount: number;
  onUpdate: (pa: PriorAuthorizationDetail) => void;
}) {
  const [busy, setBusy] = useState(false);
  const canRun = pa.status === 'draft' || pa.status === 'gathering' || pa.status === 'needs_clarification' || pa.status === 'ready_for_review';

  const run = async () => {
    setBusy(true);
    try {
      onUpdate(await startExtraction(pa.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start extraction');
    } finally {
      setBusy(false);
    }
  };

  const button = canRun && pa.extraction_status !== 'running' && (
    <Button size="sm" variant="outline" className="shrink-0" disabled={busy || documentCount === 0} onClick={run}>
      {pa.extraction_status === 'idle' ? 'Find evidence in the chart' : 'Run again'}
    </Button>
  );

  let tone = 'bg-tile text-body';
  let message: React.ReactNode;
  switch (pa.extraction_status) {
    case 'running':
      tone = 'bg-blue-tint text-blue-deep';
      message = 'Reading the chart against each criterion…';
      break;
    case 'failed':
      tone = 'bg-orange-tint text-orange-deep';
      message = pa.extraction_error ?? 'Extraction failed.';
      break;
    case 'succeeded':
      message = (
        <>
          Evidence found {pa.extracted_at ? formatDateTime(pa.extracted_at) : ''}. Every excerpt is quoted from the chart; verify
          each one before marking a requirement met.
          {pa.extraction_error && <span className="mt-1 block text-yellow-deep">{pa.extraction_error}</span>}
        </>
      );
      break;
    default:
      message = documentCount === 0
        ? 'Add chart documents on the patient page, then find evidence.'
        : `Nora has not read the chart for this request yet (${documentCount} document${documentCount === 1 ? '' : 's'} on file).`;
  }

  return (
    <div className={`mb-4 flex flex-col gap-3 rounded-tile px-5 py-4 text-sm leading-relaxed sm:flex-row sm:items-center ${tone}`} role="status">
      <div className="flex-1">{message}</div>
      {button}
    </div>
  );
}

/**
 * The staff member's final check, and submission under the prescriber's name.
 * No clinician signs off: staff own the request, the way practices submit on
 * CoverMyMeds. Confirming the check records who submitted, on whose behalf,
 * and exactly what was sent.
 */
function SubmitPanel({ pa, onUpdate }: { pa: PriorAuthorizationDetail; onUpdate: (pa: PriorAuthorizationDetail) => void }) {
  const [reference, setReference] = useState(pa.payer_reference ?? '');
  const [minutes, setMinutes] = useState(pa.prep_minutes_reported?.toString() ?? '');
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const blocker = submitBlocker(pa);
  const check = pa.final_check;
  const packetReady = packetAvailable(pa);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      onUpdate(await submitPriorAuthorization(pa.id, {
        payer_reference: reference || undefined,
        prep_minutes_reported: minutes ? Number(minutes) : undefined,
      }));
      toast.success('Submitted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit');
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    try {
      await downloadPacket(pa.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not download the packet');
    }
  };

  return (
    <Panel title={check ? 'Submitted' : 'Final check and submit'} tour="submit">
      {check ? (
        <p className="text-sm leading-relaxed text-body">
          Checked and submitted by {check.checked_by.name} on behalf of {check.on_behalf_of.name}, {formatDateTime(check.checked_at)}.
        </p>
      ) : isEditable(pa.status) ? (
        <form onSubmit={submit} className="space-y-3">
          {blocker ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{blocker}</p>
          ) : (
            <>
              <label className="flex items-start gap-3 text-sm leading-relaxed text-body">
                <input type="checkbox" className="mt-1 size-4 accent-[#171717]" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
                <span>
                  I checked every answer and its source. This goes to the plan under {pa.requested_by.name}&apos;s name.
                </span>
              </label>
              <div className="space-y-2">
                <Label htmlFor="payer_reference">Payer reference (optional)</Label>
                <Input id="payer_reference" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prep_minutes">Minutes you spent preparing this (optional)</Label>
                <Input id="prep_minutes" type="number" min={0} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              </div>
            </>
          )}
          <Button type="submit" className="w-full" disabled={busy || blocker !== null || !checked}>Submit to the plan</Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">This request is no longer being prepared.</p>
      )}
      {packetReady && (
        <Button className="mt-3 w-full" variant="outline" onClick={download}>Download packet (PDF)</Button>
      )}
    </Panel>
  );
}

function StatusPanel({ pa, onUpdate }: { pa: PriorAuthorizationDetail; onUpdate: (pa: PriorAuthorizationDetail) => void }) {
  const [target, setTarget] = useState<PaStatus | ''>('');
  const [busy, setBusy] = useState(false);

  if (pa.allowed_transitions.length === 0) {
    return (
      <Panel title="Status">
        <p className="text-sm text-muted-foreground">
          {pa.submitted_at ? `Submitted ${formatCalendarDate(pa.submitted_at)}. ` : ''}
          {pa.decided_at ? `Decided ${formatCalendarDate(pa.decided_at)}. ` : ''}
          {pa.payer_reference ? `Payer reference ${pa.payer_reference}.` : ''}
          {!pa.submitted_at && !pa.payer_reference && 'Do the final check to submit it.'}
        </p>
      </Panel>
    );
  }

  const change = async (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (target === 'cancelled' && !window.confirm('Cancel this prior authorization?')) return;
    setBusy(true);
    try {
      onUpdate(await transitionPriorAuthorization(pa.id, target));
      setTarget('');
      toast.success('Status updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not change status');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Status">
      <form onSubmit={change} className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {pa.allowed_transitions.map((s) => (
            <Button key={s} type="button" size="sm" variant={target === s ? 'default' : 'outline'} aria-pressed={target === s} onClick={() => setTarget(s)}>
              {TRANSITION_LABELS[s] ?? s}
            </Button>
          ))}
        </div>
        {target && <Button type="submit" size="sm" disabled={busy}>Confirm: {TRANSITION_LABELS[target] ?? target}</Button>}
      </form>
    </Panel>
  );
}

function AssignmentPanel({ pa, onUpdate }: { pa: PriorAuthorizationDetail; onUpdate: (pa: PriorAuthorizationDetail) => void }) {
  const { data: members } = useMembers();

  const assign = async (value: string) => {
    try {
      onUpdate(await updatePriorAuthorization(pa.id, { assigned_to_id: value ? Number(value) : null }));
      toast.success('Reassigned');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reassign');
    }
  };

  return (
    <Panel title="Assigned to">
      <NativeSelect aria-label="Assigned to" value={pa.assigned_to?.id ?? ''} onChange={(e) => assign(e.target.value)}>
        <option value="">Unassigned</option>
        {members?.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
      </NativeSelect>
    </Panel>
  );
}
