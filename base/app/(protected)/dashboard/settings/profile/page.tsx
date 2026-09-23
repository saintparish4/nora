'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/context';
import { updateProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ProfileForm = {
  first_name: string;
  last_name: string;
  state: string;
  phone: string;
};

const FIELDS: {
  key: keyof ProfileForm;
  label: string;
  hint?: string;
  inputMode?: 'text' | 'tel';
  maxLength?: number;
}[] = [
  { key: 'first_name', label: 'First name' },
  { key: 'last_name', label: 'Last name' },
  { key: 'state', label: 'State', hint: 'Two-letter abbreviation, e.g. TX', maxLength: 2 },
  { key: 'phone', label: 'Phone', hint: '10 digits, no spaces or dashes', inputMode: 'tel', maxLength: 10 },
];

/**
 * Name, state, and phone. Email is shown read-only: changing it is an identity
 * change that needs a confirmation flow, and the API ignores the field.
 */
export default function ProfileSettingsPage() {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const serverForm: ProfileForm = useMemo(
    () => ({
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      state: user?.state ?? '',
      phone: user?.phone ?? '',
    }),
    [user]
  );

  // Edits win over the server copy; derived rather than synced in an effect so a
  // background user revalidation can't wipe what's being typed.
  const [edits, setEdits] = useState<Partial<ProfileForm>>({});
  const form: ProfileForm = { ...serverForm, ...edits };
  const isDirty = Object.keys(edits).some(
    (key) => form[key as keyof ProfileForm] !== serverForm[key as keyof ProfileForm]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const updated = await updateProfile(form);
      updateUser(updated);
      setEdits({});
      toast.success('Profile saved');
    } catch (error) {
      Sentry.captureException(error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save profile'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-gray-600">
            How we address you and reach you about appointments
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/settings">Back to settings</Link>
        </Button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-surface-elevated rounded-2xl shadow-sm border border-border p-6 max-w-2xl"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {FIELDS.map(({ key, label, hint, inputMode, maxLength }) => {
            const id = key.replace(/_/g, '-');
            return (
              <div key={key} className="flex flex-col gap-2">
                <Label htmlFor={id}>{label}</Label>
                <Input
                  id={id}
                  value={form[key]}
                  inputMode={inputMode}
                  maxLength={maxLength}
                  onChange={(e) =>
                    setEdits((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  aria-describedby={hint ? `${id}-hint` : undefined}
                />
                {hint && (
                  <p id={`${id}-hint`} className="text-xs text-gray-500">
                    {hint}
                  </p>
                )}
              </div>
            );
          })}

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ''} readOnly disabled />
            <p className="text-xs text-gray-500">
              Contact support to change the email on your account.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <Button type="submit" disabled={saving || !isDirty}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          {isDirty && !saving && (
            <Button type="button" variant="ghost" onClick={() => setEdits({})}>
              Discard
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
