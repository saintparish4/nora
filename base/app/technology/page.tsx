'use client';

import Link from 'next/link';
import { NoraLogo } from '@/components/navigation/nora-logo';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessageList } from '@/components/chat/chat-message-list';
import type { ChatMessageData } from '@/components/chat/chat-message';
import { sendSymptomChatMessage } from '@/lib/api/symptom-chat';
import { useAuth } from '@/lib/auth/context';
import type { SymptomAnalysis, ChatProvider } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_CHARS = 30;

// ---------------------------------------------------------------------------
// Session ID — generated once per browser session
// ---------------------------------------------------------------------------

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('symptom_chat_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('symptom_chat_session_id', id);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Initial assistant greeting (shown before any API call)
// ---------------------------------------------------------------------------

const WELCOME_MESSAGE: ChatMessageData = {
  id: 'welcome',
  role: 'ai',
  content:
    "Hello, I'm your diagnostic assistant. To get started, please describe your main symptoms and how long you've been feeling this way. The more detail you provide, the better I can help.",
};

// ---------------------------------------------------------------------------
// Provider booking card – rendered inline in chat
// ---------------------------------------------------------------------------

function ProviderCard({
  analysis,
  providers,
  onBook,
}: {
  analysis: SymptomAnalysis;
  providers: ChatProvider[];
  onBook: (provider: ChatProvider) => void;
}) {
  const urgencyColors: Record<string, string> = {
    routine: 'bg-green-50 text-green-800 border-green-200',
    urgent: 'bg-orange-50 text-orange-800 border-orange-200',
    emergency: 'bg-red-50 text-red-800 border-red-200',
  };

  return (
    <div className="self-start max-w-[90%] animate-fade-in">
      {/* Analysis summary */}
      <div className="mb-4 p-5 bg-white/90 backdrop-blur-sm border border-[var(--glass-border)] rounded-[20px] rounded-tl-md shadow-organic-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[0.7rem] uppercase tracking-widest opacity-50 font-semibold">
            Recommendation
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-3 py-1 bg-[var(--ink-color)]/5 rounded-full text-[0.8rem] font-semibold">
            {analysis.specialty_name}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-[0.8rem] font-medium border ${
              urgencyColors[analysis.urgency] ?? urgencyColors.routine
            }`}
          >
            {analysis.urgency.charAt(0).toUpperCase() + analysis.urgency.slice(1)}
          </span>
        </div>
        {analysis.urgency_details && (
          <p className="text-[0.8rem] opacity-60">
            {analysis.urgency_details.message}
          </p>
        )}
      </div>

      {/* Provider cards */}
      {providers.length > 0 && (
        <div className="space-y-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="p-5 bg-white/90 backdrop-blur-sm border border-[var(--glass-border)] rounded-[20px] shadow-organic-sm hover:shadow-organic transition-shadow duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--beam-start)] to-[var(--beam-end)] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                  {provider.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-[0.95rem] truncate">
                    {provider.name}
                  </h4>
                  <p className="text-[0.8rem] opacity-60">{provider.specialty}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-[0.78rem] opacity-50">
                    {provider.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        {Number(provider.rating).toFixed(1)}
                      </span>
                    )}
                    {provider.location && <span>{provider.location}</span>}
                    {provider.hourly_rate > 0 && (
                      <span>${provider.hourly_rate}/hr</span>
                    )}
                  </div>
                  {provider.next_available_slots.length > 0 && (
                    <p className="text-[0.78rem] text-green-700 mt-1">
                      Next available:{' '}
                      {new Date(
                        provider.next_available_slots[0].start_time
                      ).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onBook(provider)}
                className="mt-4 w-full py-2.5 bg-[var(--ink-color)] text-[var(--bg-color)] rounded-[var(--radius-pill)] text-[0.85rem] font-medium cursor-pointer border-0 transition-all duration-200 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
              >
                Book with {provider.name.split(' ')[0]}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Technology page — Conversational Symptom Analyzer
// ---------------------------------------------------------------------------

export default function TechnologyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessageData[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef<string>('');

  // Recommendation state — set when the API returns analysis + providers
  const [recommendation, setRecommendation] = useState<{
    analysis: SymptomAnalysis;
    providers: ChatProvider[];
  } | null>(null);

  // Initialize session ID on mount (client-only)
  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
  }, []);

  // ------- Send message to API -------
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputValue.trim();
      if (!text || isLoading) return;
      if (text.length < MIN_CHARS) return; // enforced by disabled state, but double-check

      setInputValue('');
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: 'user', content: text },
      ]);
      setIsLoading(true);

      try {
        const response = await sendSymptomChatMessage(
          sessionIdRef.current,
          text
        );

        // Append assistant message
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'ai',
            content: response.assistant_message,
          },
        ]);

        // If analysis is ready, show the provider card
        if (!response.need_more_detail && response.analysis && response.providers) {
          setRecommendation({
            analysis: response.analysis,
            providers: response.providers,
          });
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-error-${Date.now()}`,
            role: 'ai',
            content: `I'm sorry, I encountered an issue: ${errorMsg}`,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [inputValue, isLoading]
  );

  // ------- Book with provider -------
  const handleBookProvider = useCallback(
    (provider: ChatProvider) => {
      // Build the quick-booking URL with pre-fill params
      const bookingUrl = `/quick-booking?specialty=${encodeURIComponent(
        provider.specialty
      )}&provider_id=${provider.id}`;

      if (!user) {
        // Not logged in — redirect to login with returnUrl
        router.push(
          `/login?returnUrl=${encodeURIComponent(bookingUrl)}`
        );
      } else {
        // Already logged in — go directly to quick-booking
        router.push(bookingUrl);
      }
    },
    [user, router]
  );

  // ------- End session -------
  const handleEndSession = useCallback(() => {
    // Clear session storage so a new session starts next time
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('symptom_chat_session_id');
    }
    setMessages([WELCOME_MESSAGE]);
    setRecommendation(null);
    sessionIdRef.current = getOrCreateSessionId();
  }, []);

  const inputTrimmed = inputValue.trim();
  const charCount = inputTrimmed.length;
  const isBelowMin = charCount > 0 && charCount < MIN_CHARS;
  const canSend = charCount >= MIN_CHARS && !isLoading;

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

            {/* Message list + provider card */}
            <ChatMessageList
              messages={messages}
              isLoading={isLoading}
              renderAfter={
                recommendation ? (
                  <ProviderCard
                    analysis={recommendation.analysis}
                    providers={recommendation.providers}
                    onBook={handleBookProvider}
                  />
                ) : undefined
              }
            />

            {/* Input – pinned to bottom, outside scroll flow */}
            <div
              className="absolute bottom-0 left-0 right-0 pt-6 px-8 lg:px-10 pb-6 lg:pb-8 z-10"
              style={{
                background:
                  'linear-gradient(to top, rgba(239,238,236,1) 60%, rgba(239,238,236,0) 100%)',
              }}
            >
              {/* Character count hint */}
              {isBelowMin && (
                <p className="text-[0.75rem] text-[var(--ink-color)]/50 mb-2 pl-2">
                  {charCount} / {MIN_CHARS} characters minimum
                </p>
              )}

              <form
                onSubmit={handleSubmit}
                className="flex items-center bg-white border border-[var(--ink-color)] rounded-[var(--radius-pill)] pl-6 pr-2 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-shadow duration-300 focus-within:shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Describe your symptoms in detail..."
                  disabled={isLoading}
                  className="flex-1 border-0 outline-none font-sans text-[0.95rem] bg-transparent min-w-0 disabled:opacity-60 placeholder:text-[var(--ink-color)]/30"
                  aria-label="Your response"
                />
                <button
                  type="submit"
                  disabled={!canSend}
                  className="w-11 h-11 rounded-full bg-[var(--ink-color)] text-white border-0 cursor-pointer flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 flex-shrink-0"
                  aria-label="Send"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
