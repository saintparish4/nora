'use client';

import Link from 'next/link';
import { NoraLogo } from '@/components/navigation/nora-logo';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { ChatMessageList } from '@/components/chat/chat-message-list';
import type { ChatMessageData } from '@/components/chat/chat-message';

// ---------------------------------------------------------------------------
// Types – extend as needed when you connect the backend
// ---------------------------------------------------------------------------

/** Patient/session context from backend – placeholder shape */
export interface PatientContext {
  displayName: string;
  primaryLocation?: string;
}

/** Backend API surface – implement these when connecting your API */
export interface SymptomAnalyzerBackend {
  sendMessage(sessionId: string | null, userMessage: string): Promise<ChatMessageData[]>;
  startOrResumeSession(): Promise<{ sessionId: string; initialMessages?: ChatMessageData[] }>;
  endSession(sessionId: string): Promise<void>;
  getPatientContext(sessionId: string | null): Promise<PatientContext | null>;
}

// ---------------------------------------------------------------------------
// Backend placeholder – replace with real client (fetch, SDK, etc.)
// ---------------------------------------------------------------------------

function useSymptomAnalyzerBackend(): {
  sendMessage: (text: string) => Promise<void>;
  endSession: () => Promise<void>;
  patientContext: PatientContext | null;
  isLoading: boolean;
} {
  const [patientContext] = useState<PatientContext | null>({
    displayName: 'Anonymous Guest',
    primaryLocation: 'NY',
  });
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    // TODO: call your backend, e.g. POST /api/symptom-analyzer/chat
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    setIsLoading(false);
  }, []);

  const endSession = useCallback(async () => {
    // TODO: call your backend, e.g. POST /api/symptom-analyzer/end
    await new Promise((r) => setTimeout(r, 100));
  }, []);

  return { sendMessage, endSession, patientContext, isLoading };
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const INITIAL_MESSAGES: ChatMessageData[] = [
  {
    id: 'welcome',
    role: 'ai',
    content:
      "Hello. I am Aura's diagnostic assistant. To help me understand what you're experiencing, could you please describe your primary symptom and when it started?",
  },
  {
    id: 'user-1',
    role: 'user',
    content:
      "I've been having a persistent sharp pain in my lower back since yesterday morning. It seems to get worse when I try to stand up straight.",
  },
  {
    id: 'ai-1',
    role: 'ai',
    content:
      'I understand. Sharp lower back pain aggravated by standing. Have you noticed any numbness, tingling, or weakness radiating down either of your legs?',
  },
];

// ---------------------------------------------------------------------------
// Technology page = Symptom Analyzer
// ---------------------------------------------------------------------------

export default function TechnologyPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageData[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');

  const { sendMessage, endSession, patientContext, isLoading } =
    useSymptomAnalyzerBackend();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputValue.trim();
      if (!text || isLoading) return;
      setInputValue('');
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: 'user', content: text },
      ]);
      sendMessage(text);
    },
    [inputValue, isLoading, sendMessage]
  );

  const handleEndSession = useCallback(async () => {
    await endSession();
    router.push('/');
  }, [endSession, router]);

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
            <Link
              href="/login"
              className="px-6 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.9rem] no-underline text-[var(--ink-color)] transition-all duration-300 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]"
            >
              Patient Login
            </Link>
            <button
              type="button"
              onClick={handleEndSession}
              className="px-5 py-2.5 border border-[var(--ink-color)] rounded-[var(--radius-pill)] text-[0.9rem] text-[var(--ink-color)] bg-transparent cursor-pointer transition-all duration-200 hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)]"
            >
              End Session
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
                  {patientContext?.displayName ?? 'Anonymous Guest'}
                </div>
                <div className="flex items-center gap-2 text-[0.85rem]">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: 'var(--beam-end)' }}
                  />
                  Primary Location: {patientContext?.primaryLocation ?? 'NY'}
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

            {/* Message list – handles scroll, animations, typing indicator */}
            <ChatMessageList messages={messages} isLoading={isLoading} />

            {/* Input – pinned to bottom, outside scroll flow */}
            <div
              className="absolute bottom-0 left-0 right-0 pt-6 px-8 lg:px-10 pb-6 lg:pb-8 z-10"
              style={{
                background:
                  'linear-gradient(to top, rgba(239,238,236,1) 60%, rgba(239,238,236,0) 100%)',
              }}
            >
              <form
                onSubmit={handleSubmit}
                className="flex items-center bg-white border border-[var(--ink-color)] rounded-[var(--radius-pill)] pl-6 pr-2 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-shadow duration-300 focus-within:shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your response here..."
                  disabled={isLoading}
                  className="flex-1 border-0 outline-none font-sans text-[0.95rem] bg-transparent min-w-0 disabled:opacity-60 placeholder:text-[var(--ink-color)]/30"
                  aria-label="Your response"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
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
