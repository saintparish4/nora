'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import type { Appointment } from '@/types';

/**
 * 1x1 JPEG used as the blur placeholder for provider avatars, which load from a
 * remote host. Inline so no extra request is needed before the blur shows.
 */
const AVATAR_BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAAKAA0DASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUE/8QAIBAAAgIBBAMBAAAAAAAAAAAAAQIDBAUREiExBv/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCw7m1bQ8p2fDW2tRyQUUJWqdJPqWxjsqvGzstcjHVL1FRStFJbgAAAAAAAAAA/9k=';

const STATUS_BADGE_CLASSES: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  confirmed: 'bg-blue-100 text-blue-800',
  pending: 'bg-gray-100 text-gray-800',
};

function ProviderAvatar({ appointment }: { appointment: Appointment }) {
  if (appointment.provider?.avatar_url) {
    return (
      <Image
        src={appointment.provider.avatar_url}
        alt=""
        role="presentation"
        width={64}
        height={64}
        className="w-16 h-16 rounded-full object-cover flex-shrink-0 border border-border bg-muted"
        placeholder="blur"
        blurDataURL={AVATAR_BLUR_DATA_URL}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="w-16 h-16 bg-brand/15 text-brand rounded-full flex-shrink-0 flex items-center justify-center text-xl font-bold"
    >
      {appointment.provider?.name?.charAt(0) ?? '?'}
    </div>
  );
}

interface AppointmentCardProps {
  appointment: Appointment;
  /** Past appointments are dimmed and always show their status. */
  past?: boolean;
  /** Omit to render without a cancel action (past appointments). */
  onCancel?: (id: number) => void;
  cancelling?: boolean;
}

/**
 * One appointment, as shown on the appointments list and the history page.
 * Shared so the two views can't drift on avatar handling or status badges.
 */
export function AppointmentCard({
  appointment,
  past = false,
  onCancel,
  cancelling = false,
}: AppointmentCardProps) {
  const isCancelled = appointment.status === 'cancelled';
  const showStatus = past || isCancelled;

  return (
    <div
      className={`bg-surface-elevated rounded-2xl shadow-sm p-6 border border-border ${
        past ? 'text-muted-foreground' : ''
      } ${isCancelled && !past ? 'border-dashed bg-muted/40 text-muted-foreground' : ''}`}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div className="flex gap-4">
          <ProviderAvatar appointment={appointment} />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {appointment.provider?.name}
            </h3>
            <p className={`mb-2 ${past ? 'text-gray-600' : 'text-[var(--brand)]'}`}>
              {appointment.provider?.specialty}
            </p>
            <p className="text-sm text-gray-600 mb-1">
              📅 {formatDateTime(appointment.start_time)}
            </p>
            {appointment.provider?.location && (
              <p className="text-sm text-gray-600">
                📍 {appointment.provider.location}
              </p>
            )}
            {appointment.notes && (
              <p className="text-sm text-gray-600 mt-2 italic">
                <strong>Note:</strong> {appointment.notes}
              </p>
            )}
            {showStatus && (
              <span
                className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full ${
                  STATUS_BADGE_CLASSES[appointment.status] ??
                  STATUS_BADGE_CLASSES.pending
                }`}
              >
                {appointment.status}
              </span>
            )}
          </div>
        </div>

        {onCancel && !isCancelled && (
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(appointment.id)}
              disabled={cancelling}
              className="text-red-600 border-red-600 hover:bg-red-50"
              aria-label={`Cancel appointment with ${appointment.provider?.name}`}
            >
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
