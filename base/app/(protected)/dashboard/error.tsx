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
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-orange-tint text-orange-deep">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <div className="max-w-sm">
        <h2 className="text-[1.75rem] leading-tight">Something went wrong</h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-body">
          We&apos;ve been notified and are looking into it. Nothing you saved is lost. Try this section again.
        </p>
      </div>
      <Button variant="secondary" onClick={reset}>Try again</Button>
    </div>
  );
}
