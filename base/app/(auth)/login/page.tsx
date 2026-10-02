'use client';

import { Suspense, useState, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { AuthShell, FormError } from '@/components/navigation/auth-shell';
import { Notice } from '@/components/workspace/notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function LoginContent() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') ?? undefined;
  const sessionExpired = searchParams.get('reason') === 'session_expired';
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, returnUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Pick up where your practice left off.">
      {sessionExpired && (
        <Notice tone="warning" role="status" className="mb-5">
          Your session has expired. Please sign in again to continue.
        </Notice>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 rounded-2xl border border-border bg-white p-4 text-sm leading-relaxed">
          <p className="mb-1 font-medium text-ink">Demo accounts (synthetic data)</p>
          <p className="text-muted-foreground">
            <code>demo@nora.com</code> (admin), <code>clinician@nora.com</code>, or <code>ma@nora.com</code>, password{' '}
            <code>password123</code>.
          </p>
        </div>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        Just looking?{' '}
        <Link href="/demo" className="font-medium text-blue-deep hover:underline">
          Open the demo practice
        </Link>
      </p>

      <p className="mt-3 text-sm text-muted-foreground">
        New practice?{' '}
        <Link
          href={returnUrl ? `/signup?returnUrl=${encodeURIComponent(returnUrl)}` : '/signup'}
          className="font-medium text-blue-deep hover:underline"
        >
          Set up Nora
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  );
}
