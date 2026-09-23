'use client';

import Link from 'next/link';
import { NoraLogo } from '@/components/navigation/nora-logo';
import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';
import {
  SymptomChatPanel,
  type SymptomChatPanelHandle,
} from '@/components/chat/symptom-chat-panel';
import { useAuth } from '@/lib/auth/context';
import type { ChatProvider } from '@/types';

// ---------------------------------------------------------------------------
// Technology page — Conversational Symptom Analyzer
// ---------------------------------------------------------------------------

export default function TechnologyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const chatRef = useRef<SymptomChatPanelHandle | null>(null);

  // ------- Book with provider -------
  const handleBookProvider = useCallback(
    (provider: ChatProvider) => {
      const bookingUrl = `/dashboard/get-care?specialty=${encodeURIComponent(
        provider.specialty
      )}&provider_id=${provider.id}`;

      if (!user) {
        router.push(
          `/login?returnUrl=${encodeURIComponent(bookingUrl)}`
        );
      } else {
        router.push(bookingUrl);
      }
    },
    [user, router]
  );

  // ------- End session -------
  const handleEndSession = useCallback(() => {
    chatRef.current?.reset();
  }, []);

  return (
    <div className="h-dvh bg-[var(--bg-color)] text-[var(--ink-color)] font-sans overflow-hidden relative flex flex-col">
      <div className="noise-overlay" aria-hidden />

      <div className="max-w-[1200px] w-full mx-auto px-6 flex flex-col flex-1 min-h-0 relative z-[2]">
        {/* Nav */}
        <nav className="flex justify-between items-center py-8 flex-shrink-0">
          <NoraLogo className="font-serif text-2xl italic flex items-center gap-3 text-[var(--ink-color)] no-underline" />
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/specialists"
              className="nav-item-underline text-[0.9rem] relative opacity-70 hover:opacity-100"
            >
              Specialists
            </Link>
            <Link
              href="/locations"
              className="nav-item-underline text-[0.9rem] relative opacity-70 hover:opacity-100"
            >
              Locations
            </Link>
            <Link
              href="/technology"
              className="nav-item-underline text-[0.9rem] relative font-semibold opacity-100 after:!w-full"
            >
              SymptomX
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[rgba(15,17,21,0.05)] text-[0.75rem] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60] analyzer-status-pulse" />
              SECURE ANALYZER ACTIVE
            </div>
            {!user ? (
              <Link
                href="/login"
                className="px-6 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.9rem] no-underline text-[var(--ink-color)] transition-all duration-300 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]"
              >
                Patient Login
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="px-6 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.9rem] no-underline text-[var(--ink-color)] transition-all duration-300 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]"
              >
                Dashboard
              </Link>
            )}
            <button
              type="button"
              onClick={handleEndSession}
              className="px-5 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.9rem] text-[var(--ink-color)] bg-transparent cursor-pointer transition-all duration-200 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]"
            >
              New Session
            </button>
          </div>
        </nav>

        {/* Chat layout: sidebar + main */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 lg:gap-10 pb-10 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <aside className="flex flex-col gap-6 flex-shrink-0 lg:max-w-[300px]">
            <div className="p-6 border border-[var(--glass-border)] rounded-[var(--radius-card)] bg-[rgba(255,255,255,0.3)]">
              <h4 className="font-sans text-[0.7rem] uppercase tracking-widest mb-4 opacity-50">
                Patient Context
              </h4>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[0.85rem]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--beam-start)]" />
                  {user?.email ?? 'Anonymous Guest'}
                </div>
              </div>
            </div>

            <div className="p-6 border border-[var(--glass-border)] rounded-[var(--radius-card)] bg-[rgba(255,255,255,0.3)]">
              <h4 className="font-sans text-[0.7rem] uppercase tracking-widest mb-4 opacity-50">
                Aura Intelligence
              </h4>
              <p className="text-[0.85rem] leading-relaxed opacity-70">
                Our clinical-grade AI model is processing your input against 14M+
                medical data points. This is not a diagnosis.
              </p>
            </div>

            <div className="p-6 border border-[var(--glass-border)] rounded-[var(--radius-card)] bg-[rgba(255,255,255,0.3)] mt-auto">
              <h4 className="font-sans text-[0.7rem] uppercase tracking-widest mb-4 opacity-50">
                Emergency
              </h4>
              <p className="text-[0.85rem] leading-relaxed text-[#E67E22]">
                If you&apos;re experiencing a life threatening medical emergency
                please call 911.
              </p>
            </div>
          </aside>

          {/* Main chat */}
          <main className="relative bg-[rgba(255,255,255,0.4)] backdrop-blur-sm border border-[var(--glass-border)] rounded-[var(--radius-card)] overflow-hidden min-h-0">
            {/* Decorative beam */}
            <div
              className="absolute -top-[20%] -right-[10%] w-[300px] h-[140%] -z-[1] rotate-[-15deg] pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,156,107,0) 0%, rgba(224,242,194,0.3) 50%, rgba(255,156,107,0) 100%)',
                filter: 'blur(60px)',
              }}
              aria-hidden
            />

            <SymptomChatPanel
              ref={chatRef}
              className="absolute inset-0"
              onBook={handleBookProvider}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
