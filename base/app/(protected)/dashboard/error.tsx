'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-16">
      <div
        className="flex items-center justify-center w-14 h-14 rounded-full"
        style={{ background: 'rgba(255, 156, 107, 0.1)', color: '#C27045' }}
      >
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className="text-center max-w-sm">
        <h2 className="font-serif text-2xl mb-2 text-[var(--ink-color)]">
          Something went wrong
        </h2>
        <p className="text-sm opacity-60 text-[var(--ink-color)] leading-relaxed">
          We&apos;ve been notified and are looking into it. Your data is safe
          — try refreshing this section.
        </p>
      </div>

      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
