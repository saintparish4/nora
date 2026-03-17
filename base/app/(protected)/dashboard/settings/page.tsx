'use client';

import { useState, useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/context';
import { updateEmailPreferences } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const { user } = useAuth();
  const [bookingConfirmations, setBookingConfirmations] = useState(true);
  const [reminders24h, setReminders24h] = useState(true);
  const [cancellationNotices, setCancellationNotices] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setBookingConfirmations(user.booking_confirmations ?? true);
      setReminders24h(user.reminders_24h ?? true);
      setCancellationNotices(user.cancellation_notices ?? true);
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);

    try {
      await updateEmailPreferences({
        booking_confirmations: bookingConfirmations,
        reminders_24h: reminders24h,
        cancellation_notices: cancellationNotices,
      });
      toast.success('Preferences saved successfully!');
    } catch (error) {
      Sentry.captureException(error);
      console.error('Failed to save preferences:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 pb-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account preferences</p>
      </div>

      <div className="bg-surface-elevated rounded-2xl shadow-sm border border-border">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Email Notifications
          </h2>

          <fieldset className="space-y-6 border-0 p-0 m-0">
            <legend className="sr-only">Email notification preferences</legend>

            <div className="flex items-start">
              <div className="flex items-center h-5 mt-1">
                <input
                  id="booking-confirmations"
                  type="checkbox"
                  checked={bookingConfirmations}
                  onChange={(e) => setBookingConfirmations(e.target.checked)}
                  className="w-5 h-5 accent-[var(--brand)] border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="booking-confirmations" className="font-medium text-gray-900 cursor-pointer">
                  Booking Confirmations
                </label>
                <p className="text-sm text-gray-500">
                  Receive an email when you book a new appointment
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5 mt-1">
                <input
                  id="reminders"
                  type="checkbox"
                  checked={reminders24h}
                  onChange={(e) => setReminders24h(e.target.checked)}
                  className="w-5 h-5 accent-[var(--brand)] border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="reminders" className="font-medium text-gray-900 cursor-pointer">
                  24-Hour Reminders
                </label>
                <p className="text-sm text-gray-500">
                  Get reminded about your appointments 24 hours in advance
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5 mt-1">
                <input
                  id="cancellations"
                  type="checkbox"
                  checked={cancellationNotices}
                  onChange={(e) => setCancellationNotices(e.target.checked)}
                  className="w-5 h-5 accent-[var(--brand)] border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label htmlFor="cancellations" className="font-medium text-gray-900 cursor-pointer">
                  Cancellation Notices
                </label>
                <p className="text-sm text-gray-500">
                  Be notified when appointments are cancelled
                </p>
              </div>
            </div>
          </fieldset>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
