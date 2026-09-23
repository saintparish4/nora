'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { useAppointments, cancelAppointment, type Appointment } from '@/lib/api';
import Link from 'next/link';
import { AppointmentsPageSkeleton } from '@/components/ui/page-skeleton';
import { AppointmentCard } from '@/components/dashboard/appointment-card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AppointmentsPage() {
  const { data, isLoading, mutate } = useAppointments();
  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];

  const [cancelling, setCancelling] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const handleCancelConfirm = async () => {
    if (confirmId == null || !data) return;
    const id = confirmId;
    setConfirmId(null);
    setCancelling(id);

    const optimisticData = {
      ...data,
      upcoming: data.upcoming.map((a) =>
        a.id === id ? { ...a, status: 'cancelled' } : a
      ),
    };

    try {
      await mutate(
        cancelAppointment(id).then(() => undefined),
        { optimisticData, rollbackOnError: true, revalidate: true }
      );
      toast.success('Appointment cancelled successfully.');
    } catch (error: unknown) {
      Sentry.captureException(error);
      console.error('Error cancelling appointment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel appointment');
    } finally {
      setCancelling(null);
    }
  };

  if (isLoading) {
    return <AppointmentsPageSkeleton />;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pb-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Appointments</h1>
        <p className="text-gray-600">Manage your upcoming and past appointments</p>
      </div>

      {/* Upcoming Appointments */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="bg-surface-elevated rounded-2xl shadow-sm p-8 text-center border border-border">
            <p className="text-gray-600 mb-4">No upcoming appointments</p>
            <Button asChild>
              <Link href="/dashboard/providers">Browse Providers</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.map((appointment: Appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onCancel={setConfirmId}
                cancelling={cancelling === appointment.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Past Appointments — most recent few; the history page has them all */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Past</h2>
          {past.length > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/appointments/history">View full history</Link>
            </Button>
          )}
        </div>
        {past.length === 0 ? (
          <div className="bg-surface-elevated rounded-2xl shadow-sm p-8 text-center border border-border">
            <p className="text-gray-600">No past appointments</p>
          </div>
        ) : (
          <div className="space-y-4">
            {past.slice(0, 3).map((appointment: Appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                past
              />
            ))}
          </div>
        )}
      </div>

      {/* Cancellation confirmation dialog */}
      <Dialog open={confirmId != null} onOpenChange={(open) => { if (!open) setConfirmId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 p-6 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmId(null)}
            >
              Keep Appointment
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleCancelConfirm}
            >
              Yes, Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
