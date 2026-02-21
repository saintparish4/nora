/**
 * Shared formatting utilities used across the frontend.
 *
 * Centralised here so date/time presentation and urgency badge colors stay
 * consistent across every page that renders appointments, slots, or triage
 * results.
 */

export function formatDate(
  dateString: string,
  options?: { relative?: boolean }
): string {
  const date = new Date(dateString);

  if (options?.relative) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Compact relative timestamp for message lists: time-of-day for today,
 * weekday for the past week, short date for anything older.
 */
export function formatMessageDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const URGENCY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800 border-green-300',
  routine: 'bg-green-100 text-green-800 border-green-300',
  moderate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  urgent: 'bg-orange-100 text-orange-800 border-orange-300',
  high: 'bg-red-100 text-red-800 border-red-300',
  emergency: 'bg-red-100 text-red-800 border-red-300',
};

export function getUrgencyColor(urgency: string): string {
  return URGENCY_COLORS[urgency] || URGENCY_COLORS.routine;
}
