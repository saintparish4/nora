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
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
      <p className="text-center text-gray-600">
        We’ve been notified and are looking into it. You can try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
