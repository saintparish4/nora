'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/context';
import { updateEmailPreferences } from '@/lib/api';

type Prefs = {
  booking_confirmations: boolean;
  reminders_24h: boolean;
  cancellation_notices: boolean;
};

const SETTINGS_SECTIONS = [
  {
    href: '/dashboard/settings/profile',
    title: 'Profile',
    description: 'Your name, state, and phone number',
  },
  {
    href: '/dashboard/settings/preferences',
    title: 'Care preferences',
    description: 'Preferred location, times, provider gender, and languages',
  },
];

export default function SettingsPage() {
  const { user } = useAuth();

  const serverPrefs: Prefs = useMemo(
    () => ({
      booking_confirmations: user?.booking_confirmations ?? true,
      reminders_24h: user?.reminders_24h ?? true,
      cancellation_notices: user?.cancellation_notices ?? false,
    }),
    [user]
  );

  // Locally toggled values win over the server copy, so a background
  // revalidation can't clobber an in-flight change. Derived rather than synced
  // in an effect, which would cascade a render on every user refresh.
  const [overrides, setOverrides] = useState<Partial<Prefs>>({});
  const prefs: Prefs = { ...serverPrefs, ...overrides };

  const handleToggle = async (key: keyof Prefs, newValue: boolean) => {
    const previous = prefs[key];

    // Optimistic update — show the new state immediately.
    setOverrides((o) => ({ ...o, [key]: newValue }));
    toast.success('Preferences saved');

    try {
      await updateEmailPreferences({ ...prefs, [key]: newValue });
    } catch (error) {
      // Roll back on failure.
      setOverrides((o) => ({ ...o, [key]: previous }));
      Sentry.captureException(error);
      console.error('Failed to save preferences:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save preferences');
    }
  };

  const TOGGLES: { key: keyof Prefs; label: string; description: string }[] = [
    {
      key: 'booking_confirmations',
      label: 'Booking Confirmations',
      description: 'Receive an email when you book a new appointment',
    },
    {
      key: 'reminders_24h',
      label: '24-Hour Reminders',
      description: 'Get reminded about your appointments 24 hours in advance',
    },
    {
      key: 'cancellation_notices',
      label: 'Cancellation Notices',
      description: 'Be notified when appointments are cancelled',
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 pb-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account preferences</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SETTINGS_SECTIONS.map(({ href, title, description }) => (
          <Link
            key={href}
            href={href}
            className="p-5 bg-surface-elevated border border-border rounded-2xl shadow-sm hover:border-foreground transition-colors"
          >
            <h2 className="font-semibold text-gray-900 mb-1">{title}</h2>
            <p className="text-sm text-gray-600">{description}</p>
          </Link>
        ))}
      </div>

      <div className="bg-surface-elevated rounded-2xl shadow-sm border border-border">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Email Notifications
          </h2>

          <fieldset className="space-y-6 border-0 p-0 m-0">
            <legend className="sr-only">Email notification preferences</legend>

            {TOGGLES.map(({ key, label, description }) => {
              const inputId = key.replace(/_/g, '-');
              return (
                <div key={key} className="flex items-start">
                  <div className="flex items-center h-5 mt-1">
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={prefs[key]}
                      onChange={(e) => handleToggle(key, e.target.checked)}
                      className="w-5 h-5 accent-[var(--brand)] border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor={inputId} className="font-medium text-gray-900 cursor-pointer">
                      {label}
                    </label>
                    <p className="text-sm text-gray-500">{description}</p>
                  </div>
                </div>
              );
            })}
          </fieldset>
        </div>
      </div>
    </div>
  );
}
