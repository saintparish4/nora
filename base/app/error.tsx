'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-[1.75rem] leading-tight">Something went wrong</h2>
      <p className="max-w-sm text-[0.9375rem] leading-relaxed text-body">
        We&apos;ve been notified and are looking into it. You can try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
