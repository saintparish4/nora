'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/context';
import {
  addMember,
  updateMemberRole,
  updateOrganization,
  useMembers,
  useOrganization,
  type Role,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { PageHeader, Panel, Card, ErrorNote } from '@/components/workspace/page-header';
import { Notice } from '@/components/workspace/notice';

const ROLES: Array<{ value: Role; label: string; hint: string }> = [
  { value: 'staff', label: 'Staff', hint: 'Prepares requests and reviews evidence' },
  { value: 'clinician', label: 'Clinician', hint: 'Also approves packets' },
  { value: 'admin', label: 'Admin', hint: 'Also manages the practice and its members' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" />
      {user?.organization?.demo && (
        <Notice>The demo practice&apos;s staff and settings are locked, so every visitor finds it the same way.</Notice>
      )}
      <Panel title="Your profile" action={<Link href="/dashboard/settings/profile" className="text-sm font-medium text-blue-deep hover:underline">Edit</Link>}>
        <p className="text-sm text-body">
          {user?.email} · {ROLES.find((r) => r.value === user?.role)?.label ?? user?.role}
        </p>
      </Panel>
      <PracticePanel isAdmin={isAdmin} />
      <MembersPanel isAdmin={isAdmin} currentUserId={user?.id} />
    </div>
  );
}

function PracticePanel({ isAdmin }: { isAdmin: boolean }) {
  const { data: org, mutate } = useOrganization();
  const [edits, setEdits] = useState<{ name?: string; npi?: string }>({});
  const [error, setError] = useState<unknown>(null);
  if (!org) return <Panel title="Practice"><p className="text-sm text-muted-foreground">Loading…</p></Panel>;

  const name = edits.name ?? org.name;
  const npi = edits.npi ?? org.npi ?? '';

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await mutate(await updateOrganization({ name, npi }), { revalidate: false });
      setEdits({});
      toast.success('Practice saved');
    } catch (err) {
      setError(err);
    }
  };

  return (
    <Panel title="Practice">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="org-name">Name</Label>
          <Input id="org-name" disabled={!isAdmin} value={name} onChange={(e) => setEdits((x) => ({ ...x, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-npi">Group NPI</Label>
          <Input id="org-npi" disabled={!isAdmin} inputMode="numeric" maxLength={10} value={npi} onChange={(e) => setEdits((x) => ({ ...x, npi: e.target.value }))} />
        </div>
        {isAdmin && (
          <div className="sm:col-span-2 space-y-3">
            <ErrorNote error={error} />
            <Button type="submit" size="sm">Save practice</Button>
          </div>
        )}
      </form>
    </Panel>
  );
}

function MembersPanel({ isAdmin, currentUserId }: { isAdmin: boolean; currentUserId?: number }) {
  const { data: members, mutate } = useMembers();
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', role: 'staff' as Role, password: '' });
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await addMember(form);
      setForm({ email: '', first_name: '', last_name: '', role: 'staff', password: '' });
      toast.success('Member added. Share the temporary password with them directly.');
      mutate();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (id: number, role: Role) => {
    try {
      await updateMemberRole(id, role);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change the role');
    }
  };

  return (
    <Panel title="Members">
      <ul className="mb-6 space-y-2">
        {members?.map((m) => (
          <li key={m.id}>
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{m.name}</p>
                <p className="text-sm break-all text-muted-foreground">{m.email}</p>
              </div>
              {isAdmin && m.id !== currentUserId ? (
                <NativeSelect className="sm:w-40" aria-label={`Role for ${m.name}`} value={m.role} onChange={(e) => changeRole(m.id, e.target.value as Role)}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </NativeSelect>
              ) : (
                <span className="text-sm text-muted-foreground">{ROLES.find((r) => r.value === m.role)?.label}</span>
              )}
            </Card>
          </li>
        ))}
      </ul>

      {isAdmin && (
        <form onSubmit={add} className="grid gap-4 rounded-2xl border border-border bg-white p-5 sm:grid-cols-2">
          <p className="font-medium text-ink sm:col-span-2">Add a member</p>
          <div className="space-y-2">
            <Label htmlFor="m-first">First name</Label>
            <Input id="m-first" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-last">Last name</Label>
            <Input id="m-last" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-email">Email</Label>
            <Input id="m-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-role">Role</Label>
            <NativeSelect id="m-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}: {r.hint}</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="m-password">Temporary password</Label>
            <Input id="m-password" type="text" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="sm:col-span-2 space-y-3">
            <ErrorNote error={error} />
            <Button type="submit" size="sm" disabled={saving}>{saving ? 'Adding…' : 'Add member'}</Button>
          </div>
        </form>
      )}
    </Panel>
  );
}
