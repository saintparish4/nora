'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  addCoverage,
  deleteChartDocument,
  pasteChartDocument,
  uploadChartDocument,
  usePatient,
  usePayers,
  DOCUMENT_KINDS,
  type DocumentKind,
} from '@/lib/api';
import { formatCalendarDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { PageHeader, Panel, Card, EmptyState, ErrorNote } from '@/components/workspace/page-header';
import { PaStatusPill } from '@/components/workspace/status-pill';
import { DocumentViewer } from '@/components/workspace/document-viewer';

export default function PatientPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, error, isLoading, mutate } = usePatient(Number.isFinite(id) ? id : null);
  const [viewing, setViewing] = useState<number | null>(null);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error || !data) return <ErrorNote error={error ?? new Error('Patient not found')} />;

  const { patient, coverages, chart_documents: documents, prior_authorizations: pas } = data;

  const remove = async (docId: number) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    try {
      await deleteChartDocument(docId);
      toast.success('Document deleted');
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the document');
    }
  };

  return (
    <div>
      <PageHeader
        back={{ href: '/dashboard/patients', label: 'Patients' }}
        title={patient.full_name}
        subtitle={`DOB ${formatCalendarDate(patient.date_of_birth)}${patient.mrn ? ` · MRN ${patient.mrn}` : ''}${patient.sex ? ` · ${patient.sex}` : ''}`}
        actions={
          <Button asChild disabled={coverages.length === 0}>
            <Link href={`/dashboard/prior-authorizations/new?patient=${patient.id}`}>New prior authorization</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Prior authorizations">
          {pas.length > 0 ? (
            <ul className="space-y-2">
              {pas.map((pa) => (
                <li key={pa.id}>
                  <Link href={`/dashboard/prior-authorizations/${pa.id}`} className="group block rounded-2xl">
                    <Card className="flex flex-wrap items-center justify-between gap-2 p-4 transition-colors group-hover:border-input group-hover:bg-tile-strong/50">
                      <span className="font-medium text-ink">{pa.item_name}</span>
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        {pa.coverage.payer.name}
                        <PaStatusPill status={pa.status} />
                      </span>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No prior authorizations yet.</EmptyState>
          )}
        </Panel>

        <Panel title="Coverage">
          {coverages.length > 0 ? (
            <ul className="mb-5 space-y-2">
              {coverages.map((c) => (
                <li key={c.id}>
                  <Card className="p-4 text-sm">
                    <p className="font-medium text-ink">{c.payer.name} · {c.plan.name}</p>
                    <p className="mt-0.5 text-muted-foreground">Member {c.member_id}{c.group_number ? ` · Group ${c.group_number}` : ''}</p>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">Add the patient&apos;s insurance before starting a prior authorization.</p>
          )}
          <CoverageForm patientId={patient.id} onAdded={() => mutate()} />
        </Panel>

        <Panel title="Chart documents" className="lg:col-span-2">
          <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Paste or upload the notes, problem list, and medication history the request relies on. Evidence quotes these
            documents word for word, so a saved document cannot be edited.
          </p>
          {documents.length > 0 && (
            <ul className="mb-6 space-y-2">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{doc.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {doc.kind.replaceAll('_', ' ')}
                      {doc.occurred_on ? ` · ${formatCalendarDate(doc.occurred_on)}` : ''} · {doc.source === 'upload' ? 'uploaded' : 'pasted'} by{' '}
                      {doc.uploaded_by.name} · {doc.length.toLocaleString()} characters
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setViewing(doc.id)}>View</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(doc.id)}>Delete</Button>
                  </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
          <DocumentForm patientId={patient.id} onAdded={() => mutate()} />
        </Panel>
      </div>

      <DocumentViewer documentId={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function CoverageForm({ patientId, onAdded }: { patientId: number; onAdded: () => void }) {
  const { data: payers } = usePayers();
  const [planId, setPlanId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [group, setGroup] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await addCoverage(patientId, { insurance_plan_id: Number(planId), member_id: memberId, group_number: group || undefined });
      setPlanId('');
      setMemberId('');
      setGroup('');
      toast.success('Coverage added');
      onAdded();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2 sm:col-span-3">
        <Label htmlFor="plan">Plan</Label>
        <NativeSelect id="plan" required value={planId} onChange={(e) => setPlanId(e.target.value)}>
          <option value="">Choose a plan</option>
          {payers?.map((payer) => (
            <optgroup key={payer.id} label={payer.name}>
              {payer.plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {payer.name} · {plan.name}{plan.plan_type ? ` (${plan.plan_type})` : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="member_id">Member ID</Label>
        <Input id="member_id" required value={memberId} onChange={(e) => setMemberId(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="group">Group (optional)</Label>
        <Input id="group" value={group} onChange={(e) => setGroup(e.target.value)} />
      </div>
      <div className="flex items-end">
        <Button type="submit" variant="outline" disabled={saving} className="w-full">{saving ? 'Adding…' : 'Add coverage'}</Button>
      </div>
      <div className="sm:col-span-3"><ErrorNote error={error} /></div>
    </form>
  );
}

function DocumentForm({ patientId, onAdded }: { patientId: number; onAdded: () => void }) {
  const [mode, setMode] = useState<'paste' | 'upload'>('paste');
  const [kind, setKind] = useState<DocumentKind>('office_note');
  const [title, setTitle] = useState('');
  const [occurredOn, setOccurredOn] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const meta = { kind, title: title || undefined, occurred_on: occurredOn || undefined };
    try {
      if (mode === 'upload') {
        if (!file) throw new Error('Choose a file to upload.');
        await uploadChartDocument(patientId, meta, file);
      } else {
        await pasteChartDocument(patientId, meta, body);
      }
      setTitle('');
      setOccurredOn('');
      setBody('');
      setFile(null);
      toast.success('Document added');
      onAdded();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="How to add the document">
        {(['paste', 'upload'] as const).map((m) => (
          <Button key={m} type="button" size="sm" role="tab" aria-selected={mode === m} variant={mode === m ? 'default' : 'secondary'} onClick={() => setMode(m)}>
            {m === 'paste' ? 'Paste text' : 'Upload PDF or text file'}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="doc-kind">Type</Label>
          <NativeSelect id="doc-kind" value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
            {DOCUMENT_KINDS.map((k) => (
              <option key={k} value={k}>{k.replaceAll('_', ' ')}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="doc-title">Title{mode === 'upload' ? ' (defaults to file name)' : ''}</Label>
          <Input id="doc-title" required={mode === 'paste'} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="doc-date">Date of service</Label>
          <Input id="doc-date" type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
        </div>
      </div>
      {mode === 'paste' ? (
        <div className="space-y-2">
          <Label htmlFor="doc-body">Text</Label>
          <Textarea id="doc-body" required rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Paste the note exactly as it appears in the chart." />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="doc-file">File</Label>
          <Input id="doc-file" type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <p className="text-xs text-muted-foreground">Scanned PDFs without a text layer are not supported yet. Paste the text instead.</p>
        </div>
      )}
      <ErrorNote error={error} />
      <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add document'}</Button>
    </form>
  );
}
