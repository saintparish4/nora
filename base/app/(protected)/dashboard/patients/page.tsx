'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createPatient, usePatients } from '@/lib/api';
import { formatCalendarDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { PageHeader, Panel, Card, EmptyState, ErrorNote } from '@/components/workspace/page-header';

export default function PatientsPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const { data, error, isLoading } = usePatients({ q, page });

  return (
    <div>
      <PageHeader
        title="Patients"
        actions={<Button variant={adding ? 'secondary' : 'default'} onClick={() => setAdding((v) => !v)}>{adding ? 'Close' : 'Add patient'}</Button>}
      />

      {adding && <NewPatientForm />}

      <Panel>
        <div className="mb-4">
          <Label htmlFor="patient-search" className="sr-only">Search patients</Label>
          <Input
            id="patient-search"
            placeholder="Search by name or MRN"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <ErrorNote error={error} />
        {isLoading && !data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data && data.patients.length > 0 ? (
          <>
            <ul className="space-y-2">
              {data.patients.map((p) => (
                <li key={p.id}>
                  <Link href={`/dashboard/patients/${p.id}`} className="group block rounded-2xl">
                    <Card className="flex flex-wrap items-center justify-between gap-2 p-4 transition-colors group-hover:border-input group-hover:bg-tile-strong/50">
                      <span className="font-medium text-ink">{p.last_name}, {p.first_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {p.mrn ? `MRN ${p.mrn} · ` : ''}DOB {formatCalendarDate(p.date_of_birth)}
                      </span>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
            {data.meta.total_pages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <span className="text-muted-foreground">Page {data.meta.page} of {data.meta.total_pages}</span>
                <Button size="sm" variant="secondary" disabled={page >= data.meta.total_pages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState>{q ? 'No patients match that search.' : 'No patients yet. Add one to start a prior authorization.'}</EmptyState>
        )}
      </Panel>
    </div>
  );
}

function NewPatientForm() {
  const router = useRouter();
  const [fields, setFields] = useState({ first_name: '', last_name: '', date_of_birth: '', mrn: '', sex: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const set = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const patient = await createPatient({ ...fields, mrn: fields.mrn || undefined, sex: fields.sex || undefined });
      toast.success('Patient added');
      router.push(`/dashboard/patients/${patient.id}`);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="New patient" className="mb-6">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">First name</Label>
          <Input id="first_name" required value={fields.first_name} onChange={set('first_name')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last name</Label>
          <Input id="last_name" required value={fields.last_name} onChange={set('last_name')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of birth</Label>
          <Input id="date_of_birth" type="date" required value={fields.date_of_birth} onChange={set('date_of_birth')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mrn">MRN (optional)</Label>
          <Input id="mrn" value={fields.mrn} onChange={set('mrn')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sex">Sex (optional)</Label>
          <NativeSelect id="sex" value={fields.sex} onChange={set('sex')}>
            <option value="">Not recorded</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="unknown">Unknown</option>
          </NativeSelect>
        </div>
        <div className="sm:col-span-2 space-y-3">
          <ErrorNote error={error} />
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add patient'}</Button>
        </div>
      </form>
    </Panel>
  );
}
