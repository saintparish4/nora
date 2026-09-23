'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CalendarX } from 'lucide-react';
import { useAppointments, type Appointment } from '@/lib/api';
import { AppointmentCard } from '@/components/dashboard/appointment-card';
import { AppointmentsPageSkeleton } from '@/components/ui/page-skeleton';
import { Button } from '@/components/ui/button';

type Filter = 'all' | 'completed' | 'cancelled';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

/**
 * Full appointment history: everything the appointments endpoint returns under
 * `past`, plus upcoming appointments that were cancelled — those stop being
 * something to manage and become part of the record.
 */
export default function AppointmentHistoryPage() {
  const { data, isLoading } = useAppointments();
  const [filter, setFilter] = useState<Filter>('all');

  const history = useMemo(() => {
    const past = data?.past ?? [];
    const cancelledUpcoming = (data?.upcoming ?? []).filter(
      (a) => a.status === 'cancelled'
    );

    return [...past, ...cancelledUpcoming].sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
  }, [data]);

  const visible = useMemo(
    () =>
      filter === 'all'
        ? history
        : history.filter((a) => a.status === filter),
    [history, filter]
  );

  if (isLoading) {
    return <AppointmentsPageSkeleton />;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Appointment History
          </h1>
          <p className="text-gray-600">
            {history.length} past appointment{history.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/appointments">Back to appointments</Link>
        </Button>
      </div>

      <div className="flex gap-2" role="group" aria-label="Filter history">
        {FILTERS.map(({ value, label }) => {
          const count =
            value === 'all'
              ? history.length
              : history.filter((a) => a.status === value).length;

          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1 ${
                filter === value
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-surface-elevated border-border hover:border-foreground'
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="bg-surface-elevated rounded-2xl shadow-sm p-10 text-center border border-border">
          <CalendarX
            className="h-10 w-10 text-gray-300 mx-auto mb-3"
            aria-hidden="true"
          />
          <p className="text-gray-600 mb-4">
            {history.length === 0
              ? 'No past appointments yet.'
              : `No ${filter} appointments.`}
          </p>
          {history.length === 0 && (
            <Button asChild>
              <Link href="/dashboard/get-care">Book your first visit</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((appointment: Appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              past
            />
          ))}
        </div>
      )}
    </div>
  );
}
