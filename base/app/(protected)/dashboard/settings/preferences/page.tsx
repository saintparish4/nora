'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { useCarePreferences, updateCarePreferences } from '@/lib/api';
import {
  LANGUAGE_OPTIONS,
  PREFERRED_TIME_OPTIONS,
  PROVIDER_GENDER_OPTIONS,
  type CarePreferences,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardSkeleton } from '@/components/ui/page-skeleton';

const EMPTY: CarePreferences = {
  preferred_location: '',
  preferred_times: [],
  insurance_info: '',
  provider_gender_preference: 'no_preference',
  language_preferences: [],
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

/**
 * Care preferences: how the patient wants to be seen. Separate from the email
 * notification toggles on /dashboard/settings, which live on the user record.
 */
export default function CarePreferencesPage() {
  const { data, isLoading, error, mutate } = useCarePreferences();
  const [saving, setSaving] = useState(false);

  const saved: CarePreferences = useMemo(
    () => ({
      preferred_location: data?.preferred_location ?? '',
      preferred_times: data?.preferred_times ?? [],
      insurance_info: data?.insurance_info ?? '',
      provider_gender_preference:
        data?.provider_gender_preference ?? EMPTY.provider_gender_preference,
      language_preferences: data?.language_preferences ?? [],
    }),
    [data]
  );

  // Edits layered over the fetched copy, so a revalidation mid-edit can't
  // discard what the patient is in the middle of changing.
  const [edits, setEdits] = useState<Partial<CarePreferences>>({});
  const form: CarePreferences = { ...saved, ...edits };
  const isDirty = Object.keys(edits).length > 0;

  const set = <K extends keyof CarePreferences>(
    key: K,
    value: CarePreferences[K]
  ) => setEdits((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const updated = await updateCarePreferences(form);
      await mutate(updated, { revalidate: false });
      setEdits({});
      toast.success('Preferences saved');
    } catch (err) {
      Sentry.captureException(err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to save preferences'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Care Preferences
          </h1>
          <p className="text-gray-600">
            Tell us how you&apos;d prefer to be seen. We use this to order the
            providers we suggest.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/settings">Back to settings</Link>
        </Button>
      </div>

      {isLoading ? (
        <CardSkeleton />
      ) : error ? (
        <div className="bg-surface-elevated rounded-2xl shadow-sm border border-border p-8 text-center">
          <p className="text-gray-600">
            We couldn&apos;t load your preferences. Please try again.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-surface-elevated rounded-2xl shadow-sm border border-border p-6 max-w-2xl space-y-8"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="preferred-location">Preferred location</Label>
            <Input
              id="preferred-location"
              value={form.preferred_location ?? ''}
              placeholder="City, state"
              onChange={(e) => set('preferred_location', e.target.value)}
            />
          </div>

          <fieldset className="border-0 p-0 m-0">
            <legend className="font-medium text-gray-900 mb-3">
              Preferred times
            </legend>
            <div className="flex flex-wrap gap-2">
              {PREFERRED_TIME_OPTIONS.map(({ value, label }) => {
                const active = form.preferred_times.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      set('preferred_times', toggle(form.preferred_times, value))
                    }
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1 ${
                      active
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background border-border hover:border-foreground'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="border-0 p-0 m-0">
            <legend className="font-medium text-gray-900 mb-3">
              Provider gender
            </legend>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {PROVIDER_GENDER_OPTIONS.map(({ value, label }) => {
                const active = form.provider_gender_preference === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => set('provider_gender_preference', value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1 ${
                      active
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background border-border hover:border-foreground'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="border-0 p-0 m-0">
            <legend className="font-medium text-gray-900 mb-3">Languages</legend>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((language) => {
                const active = form.language_preferences.includes(language);
                return (
                  <button
                    key={language}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      set(
                        'language_preferences',
                        toggle(form.language_preferences, language)
                      )
                    }
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1 ${
                      active
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background border-border hover:border-foreground'
                    }`}
                  >
                    {language}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label htmlFor="insurance-info">Insurance</Label>
            <Input
              id="insurance-info"
              value={form.insurance_info ?? ''}
              placeholder="Plan name or member ID"
              onChange={(e) => set('insurance_info', e.target.value)}
              aria-describedby="insurance-info-hint"
            />
            <p id="insurance-info-hint" className="text-xs text-gray-500">
              Stored for reference only — we don&apos;t verify coverage yet.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving || !isDirty}>
              {saving ? 'Saving…' : 'Save preferences'}
            </Button>
            {isDirty && !saving && (
              <Button type="button" variant="ghost" onClick={() => setEdits({})}>
                Discard
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
