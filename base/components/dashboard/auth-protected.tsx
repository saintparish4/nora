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
      <div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <div suppressHydrationWarning>{children}</div>;
}

