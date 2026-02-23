'use client';

import { Suspense, useState, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import Link from 'next/link';

function LoginContent() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') ?? undefined;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // login() from useAuth() redirects to returnUrl (if present) or /dashboard
      await login(email, password, returnUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--ink-color)] font-sans overflow-x-hidden relative">
      <div className="noise-overlay" />

      <div className="max-w-[1200px] mx-auto px-6 relative z-[2]">
        <nav className="flex justify-between items-center py-8 relative z-10">
          <Link href="/" className="font-serif text-2xl italic flex items-center gap-3 text-[var(--ink-color)] no-underline">
            <span className="w-px h-6 bg-[var(--ink-color)] rotate-[15deg]" />
            nora.ai
          </Link>
          <div className="flex gap-6">
            <Link href="/specialists" className="text-[var(--ink-color)] text-[0.9rem] no-underline opacity-80 hover:opacity-100 transition-opacity">
              Specialists
            </Link>
            <Link href="/technology" className="text-[var(--ink-color)] text-[0.9rem] no-underline opacity-80 hover:opacity-100 transition-opacity">
              Technology
            </Link>
          </div>
          <Link
            href="/"
            className="px-6 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[var(--ink-color)] text-[0.9rem] no-underline transition-all duration-300 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]"
          >
            Return Home
          </Link>
        </nav>

        <section className="min-h-[calc(100vh-120px)] flex items-center justify-center py-10 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150px] h-[70vh] -z-[1] pointer-events-none">
            <div
              className="w-full h-full"
              style={{
                background: 'linear-gradient(180deg, rgba(255,156,107,0) 0%, rgba(255,156,107,0.6) 40%, rgba(224,242,194,0.6) 100%)',
                filter: 'blur(50px)',
                opacity: 0.7,
              }}
            />
          </div>

          <div
            className="w-full max-w-[480px] rounded-[var(--radius-card)] p-12 text-center shadow-[0_20px_40px_rgba(0,0,0,0.03)]"
            style={{
              background: 'rgba(239, 238, 236, 0.4)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <div className="mb-10">
              <h1 className="font-serif text-[2.5rem] font-normal tracking-[-0.02em] mb-2">Welcome back</h1>
              <p className="text-[0.95rem] opacity-60">Access your clinical insights and unified medical records.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="text-left mb-6">
                <label htmlFor="email" className="block text-[0.7rem] uppercase tracking-[0.08em] font-semibold mb-2 opacity-70">
                  Patient Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-5 py-4 rounded-xl border bg-white/50 font-sans text-base text-[var(--ink-color)] outline-none transition-all duration-300 focus:border-[var(--ink-color)] focus:bg-white/80"
                  style={{ borderColor: 'var(--glass-border)' }}
                />
              </div>

              <div className="text-left mb-6">
                <label htmlFor="password" className="block text-[0.7rem] uppercase tracking-[0.08em] font-semibold mb-2 opacity-70">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 rounded-xl border bg-white/50 font-sans text-base text-[var(--ink-color)] outline-none transition-all duration-300 focus:border-[var(--ink-color)] focus:bg-white/80"
                  style={{ borderColor: 'var(--glass-border)' }}
                />
                <Link href="/forgot-password" className="block text-right text-[0.8rem] mt-2 opacity-60 no-underline font-semibold text-[var(--ink-color)] relative after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:w-full after:h-px after:bg-[var(--ink-color)] after:opacity-30 hover:after:opacity-100 after:transition-opacity">
                  Trouble signing in?
                </Link>
              </div>

              {error && (
                <div className="mb-4 text-left text-sm text-red-600 bg-red-50/80 border border-red-200/50 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[var(--ink-color)] text-white border-0 rounded-[var(--radius-pill)] font-sans text-base font-medium cursor-pointer transition-all duration-300 mt-3 disabled:opacity-70 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5 hover:enabled:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
              >
                {loading ? 'Verifying...' : 'Unlock Dashboard'}
              </button>
            </form>

            <div
              className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-[0.05em] mt-6 px-3 py-1 rounded-xl"
              style={{ color: '#6B7BFF', background: 'rgba(107, 123, 255, 0.1)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              ENCRYPTED PATIENT PORTAL
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div
                className="mt-6 p-4 rounded-xl text-left"
                style={{
                  background: 'rgba(107, 123, 255, 0.08)',
                  border: '1px solid rgba(107, 123, 255, 0.2)',
                }}
              >
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.06em] opacity-80 mb-2">Try the demo</p>
                <p className="text-[0.85rem] opacity-90">
                  Use <code className="px-1.5 py-0.5 rounded bg-white/60 text-[var(--ink-color)] font-mono text-[0.8rem]">demo@nora.com</code> and password <code className="px-1.5 py-0.5 rounded bg-white/60 text-[var(--ink-color)] font-mono text-[0.8rem]">password123</code> to explore the application.
                </p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--glass-border)' }}>
              <p className="text-[0.9rem] opacity-80 mb-3">New to Aura Health AI?</p>
              <Link
                href={returnUrl ? `/signup?returnUrl=${encodeURIComponent(returnUrl)}` : '/signup'}
                className="text-[var(--ink-color)] no-underline font-semibold text-[0.85rem] relative after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:w-full after:h-px after:bg-[var(--ink-color)] after:opacity-30 hover:after:opacity-100 after:transition-opacity"
              >
                Begin your registration journey
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--ink-color)] font-sans overflow-x-hidden relative flex items-center justify-center">
      <div className="noise-overlay" />
      <p className="text-[var(--ink-color)] opacity-60">Loading...</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
