'use client';

import { Suspense, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/context';
import {
  createPriorAuthorization,
  startExtraction,
  useMembers,
  usePatient,
  usePatients,
  usePolicyTemplates,
} from '@/lib/api';
import { formatCalendarDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { PageHeader, Panel, Card, ErrorNote } from '@/components/workspace/page-header';

function NewPriorAuthorization() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const initialPatient = Number(searchParams.get('patient')) || null;

  const [patientId, setPatientId] = useState<number | null>(initialPatient);
  const [search, setSearch] = useState('');
  const [coverageId, setCoverageId] = useState('');
  const [item, setItem] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [extractNow, setExtractNow] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const { data: patients } = usePatients({ q: search });
  const { data: patient } = usePatient(patientId);
  const { data: library } = usePolicyTemplates();
  const { data: members } = useMembers();
  const clinicians = members?.filter((m) => m.role !== 'staff') ?? [];
  const coverages = patient?.coverages ?? [];
  const chosenCoverage = coverages.find((c) => String(c.id) === coverageId) ?? (coverages.length === 1 ? coverages[0] : undefined);
  const template =
    library?.templates.find((t) => t.item_name === item && t.payer?.id === chosenCoverage?.payer.id) ??
    library?.templates.find((t) => t.item_name === item && t.generic);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!patientId || !chosenCoverage) return;
    setSaving(true);
    setError(null);
    try {
      let pa = await createPriorAuthorization({
        patient_id: patientId,
        patient_coverage_id: chosenCoverage.id,
        item_name: item,
        requested_by_id: requestedBy ? Number(requestedBy) : undefined,
        assigned_to_id: user?.id,
      });
      if (extractNow && (patient?.chart_documents.length ?? 0) > 0) {
        pa = await startExtraction(pa.id);
      }
      toast.success('Prior authorization created');
      router.push(`/dashboard/prior-authorizations/${pa.id}`);
    } catch (err) {
      setError(err);
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader back={{ href: '/dashboard/prior-authorizations', label: 'Prior authorizations' }} title="New prior authorization" />

      <form onSubmit={submit} className="space-y-6">
        <Panel title="1. Patient">
          {patient ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>
                <span className="font-medium text-ink">{patient.patient.full_name}</span>{' '}
                <span className="text-sm text-muted-foreground">DOB {formatCalendarDate(patient.patient.date_of_birth)}</span>
              </p>
              <Button type="button" size="sm" variant="secondary" onClick={() => { setPatientId(null); setCoverageId(''); }}>
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="patient-search">Find a patient</Label>
              <Input id="patient-search" placeholder="Name or MRN" value={search} onChange={(e) => setSearch(e.target.value)} />
              <ul className="max-h-72 space-y-1.5 overflow-y-auto">
                {patients?.patients.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full flex-wrap items-baseline justify-between gap-x-3 rounded-2xl border border-border bg-white px-4 py-3 text-left transition-colors hover:border-input hover:bg-tile-strong/50"
                      onClick={() => setPatientId(p.id)}
                    >
                      <span className="font-medium text-ink">{p.full_name}</span>
                      <span className="text-sm text-muted-foreground">DOB {formatCalendarDate(p.date_of_birth)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                Not listed? <Link href="/dashboard/patients" className="font-medium text-blue-deep hover:underline">Add the patient</Link> first.
              </p>
            </div>
          )}
        </Panel>

        {patient && (
          <Panel title="2. Coverage">
            {coverages.length === 0 ? (
              <p className="text-sm">
                This patient has no coverage on file.{' '}
                <Link href={`/dashboard/patients/${patient.patient.id}`} className="font-medium text-blue-deep hover:underline">Add it on the patient page.</Link>
              </p>
            ) : (
              <NativeSelect aria-label="Coverage" required value={chosenCoverage ? String(chosenCoverage.id) : ''} onChange={(e) => setCoverageId(e.target.value)}>
                <option value="">Choose coverage</option>
                {coverages.map((c) => (
                  <option key={c.id} value={c.id}>{c.payer.name} · {c.plan.name} · Member {c.member_id}</option>
                ))}
              </NativeSelect>
            )}
          </Panel>
        )}

        {chosenCoverage && (
          <Panel title="3. Request">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="item">Medication</Label>
                <NativeSelect id="item" required value={item} onChange={(e) => setItem(e.target.value)}>
                  <option value="">Choose</option>
                  {library?.items.map((name) => <option key={name} value={name}>{name}</option>)}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="requested_by">Ordering clinician</Label>
                <NativeSelect id="requested_by" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)}>
                  <option value="">Me</option>
                  {clinicians.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </NativeSelect>
              </div>
            </div>

            {template && (
              <Card className="mt-5 p-4 text-sm leading-relaxed">
                <p className="font-medium text-ink">{template.title}</p>
                <p className="mt-1 text-muted-foreground">
                  {template.generic ? `No ${chosenCoverage.payer.name}-specific criteria on file; using the common baseline.` : `${chosenCoverage.payer.name} criteria.`}
                </p>
                {template.notes && <p className="mt-2 text-yellow-deep">{template.notes}</p>}
              </Card>
            )}

            <label className="mt-5 flex items-start gap-3 text-sm text-body">
              <input type="checkbox" className="mt-0.5 size-4 accent-[#171717]" checked={extractNow} onChange={(e) => setExtractNow(e.target.checked)} />
              <span>
              Find evidence in the chart right away ({patient?.chart_documents.length ?? 0} document
              {(patient?.chart_documents.length ?? 0) === 1 ? '' : 's'} on file)
              </span>
            </label>
          </Panel>
        )}

        <ErrorNote error={error} />
        <Button type="submit" size="lg" disabled={saving || !chosenCoverage || !item}>
          {saving ? 'Creating…' : 'Create prior authorization'}
        </Button>
      </form>
    </div>
  );
}

export default function NewPriorAuthorizationPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <NewPriorAuthorization />
    </Suspense>
  );
}
