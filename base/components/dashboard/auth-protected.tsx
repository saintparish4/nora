'use client';

import { useAuth } from '@/lib/auth/context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AuthProtected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Carry the current page along so login can return the user to it.
      // Read from window rather than useSearchParams() to keep this component
      // out of a Suspense boundary.
      const returnUrl = encodeURIComponent(
        window.location.pathname + window.location.search
      );
      router.push(`/login?returnUrl=${returnUrl}`);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" suppressHydrationWarning>
        <span className="sr-only">Loading...</span>
        <span className="flex items-center gap-2" aria-hidden>
          <span className="size-3 animate-pulse rounded-full bg-blue" />
          <span className="size-3 animate-pulse rounded-full bg-yellow [animation-delay:150ms]" />
          <span className="size-3 animate-pulse rounded-full bg-green [animation-delay:300ms]" />
        </span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <div suppressHydrationWarning>{children}</div>;
}

