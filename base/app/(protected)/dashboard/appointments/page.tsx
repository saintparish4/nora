'use client';

import { useState, useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { getAppointments, cancelAppointment, Appointment } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import Link from 'next/link';
import { AppointmentsPageSkeleton } from '@/components/ui/page-skeleton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AppointmentsPage() {
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [past, setPast] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await getAppointments();
      setUpcoming(data.upcoming || []);
      setPast(data.past || []);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Failed to load appointments:', error);
      toast.error('Failed to load appointments. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (confirmId == null) return;
    const id = confirmId;
    setConfirmId(null);
    setCancelling(id);
    try {
      await cancelAppointment(id);
      toast.success('Appointment cancelled successfully.');
      await loadAppointments();
    } catch (error: unknown) {
      Sentry.captureException(error);
      console.error('Error cancelling appointment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel appointment');
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
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
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-[var(--glass-border)]">
            <p className="text-gray-600 mb-4">No upcoming appointments</p>
            <Button asChild>
              <Link href="/dashboard/providers">Browse Providers</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.map((appointment: Appointment) => (
              <div
                key={appointment.id}
                className={`bg-white rounded-2xl shadow-sm p-6 border border-[var(--glass-border)] ${appointment.status === 'cancelled' ? 'opacity-60' : ''}`}
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  <div className="flex gap-4">
                    <div
                      aria-hidden="true"
                      className="w-16 h-16 bg-gray-200 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {appointment.provider?.name}
                      </h3>
                      <p className="text-[var(--brand)] mb-2">
                        {appointment.provider?.specialty}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        📅 {formatDateTime(appointment.start_time)}
                      </p>
                      <p className="text-sm text-gray-600">
                        📍 {appointment.provider?.location}
                      </p>
                      {appointment.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          <strong>Note:</strong> {appointment.notes}
                        </p>
                      )}
                      {appointment.status === 'cancelled' && (
                        <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    {appointment.status !== 'cancelled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmId(appointment.id)}
                        disabled={cancelling === appointment.id}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        aria-label={`Cancel appointment with ${appointment.provider?.name}`}
                      >
                        {cancelling === appointment.id ? 'Cancelling…' : 'Cancel'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Appointments */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Past</h2>
        {past.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-[var(--glass-border)]">
            <p className="text-gray-600">No past appointments</p>
          </div>
        ) : (
          <div className="space-y-4">
            {past.map((appointment: Appointment) => (
              <div
                key={appointment.id}
                className="bg-white rounded-2xl shadow-sm p-6 opacity-75 border border-[var(--glass-border)]"
              >
                <div className="flex gap-4">
                  <div aria-hidden="true" className="w-16 h-16 bg-gray-200 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {appointment.provider?.name}
                    </h3>
                    <p className="text-gray-600 mb-2">
                      {appointment.provider?.specialty}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      📅 {formatDateTime(appointment.start_time)}
                    </p>
                    <span
                      className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full ${
                        appointment.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </div>
                </div>
              </div>
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
