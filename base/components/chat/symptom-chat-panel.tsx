'use client';

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react';
import { ChatMessageList } from './chat-message-list';
import { RecommendationCard } from './recommendation-card';
import type { ChatMessageData } from './chat-message';
import { sendSymptomChatMessage } from '@/lib/api/symptom-chat';
import type { ChatProvider, SymptomAnalysis } from '@/types';

/** Backend rejects anything shorter, so the send button stays disabled. */
export const MIN_CHARS = 30;

const SESSION_STORAGE_KEY = 'symptom_chat_session_id';

export const WELCOME_MESSAGE: ChatMessageData = {
  id: 'welcome',
  role: 'ai',
  content:
    "Hello, I'm your diagnostic assistant. To get started, please describe your main symptoms and how long you've been feeling this way. The more detail you provide, the better I can help.",
};

/**
 * One chat session per browser tab. The id is what ties turns together into a
 * single `Conversation` row on the backend, so it has to outlive re-renders and
 * navigation within the tab.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';

  let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

export function clearSessionId(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export interface SymptomChatPanelHandle {
  /** Wipe the transcript and start a fresh conversation. */
  reset: () => void;
}

interface SymptomChatPanelProps {
  /** Called when the patient picks a provider from the recommendation card. */
  onBook: (provider: ChatProvider, analysis: SymptomAnalysis) => void;
  /** Called after each completed analysis (used to revalidate history). */
  onAnalysisComplete?: () => void;
  /**
   * Exposes `reset()` so the host page can drive "New session" from its own
   * chrome without duplicating the session bookkeeping.
   */
  ref?: Ref<SymptomChatPanelHandle>;
  className?: string;
  inputAriaLabel?: string;
}

/**
 * The conversational symptom checker: transcript, typing state, input, and the
 * recommendation card. Owns the session id and all API interaction; the host
 * page supplies the surrounding chrome and decides what "book" means.
 *
 * Extracted from the public `/technology` page so the in-product checker at
 * `/dashboard/symptoms` runs the same code path rather than a second copy.
 */
export function SymptomChatPanel({
  onBook,
  onAnalysisComplete,
  ref,
  className = '',
  inputAriaLabel = 'Your response',
}: SymptomChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageData[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef<string>('');

  const [recommendation, setRecommendation] = useState<{
    analysis: SymptomAnalysis;
    providers: ChatProvider[];
  } | null>(null);

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
  }, []);

  const reset = useCallback(() => {
    clearSessionId();
    setMessages([WELCOME_MESSAGE]);
    setRecommendation(null);
    setInputValue('');
    sessionIdRef.current = getOrCreateSessionId();
  }, []);

  useImperativeHandle(ref, () => ({ reset }), [reset]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputValue.trim();
      if (!text || isLoading) return;
      if (text.length < MIN_CHARS) return; // enforced by disabled state too

      setInputValue('');
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: 'user', content: text },
      ]);
      setIsLoading(true);

      try {
        const response = await sendSymptomChatMessage(sessionIdRef.current, text);

        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'ai',
            content: response.assistant_message,
          },
        ]);

        if (!response.need_more_detail && response.analysis && response.providers) {
          setRecommendation({
            analysis: response.analysis,
            providers: response.providers,
          });
          onAnalysisComplete?.();
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.';
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
    [inputValue, isLoading, onAnalysisComplete]
  );

  const charCount = inputValue.trim().length;
  const isBelowMin = charCount > 0 && charCount < MIN_CHARS;
  const canSend = charCount >= MIN_CHARS && !isLoading;

  return (
    <div className={`relative overflow-hidden min-h-0 ${className}`}>
      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        renderAfter={
          recommendation ? (
            <RecommendationCard
              analysis={recommendation.analysis}
              providers={recommendation.providers}
              onBook={(provider) => onBook(provider, recommendation.analysis)}
            />
          ) : undefined
        }
      />

      {/* Input – pinned to bottom, outside the scroll flow */}
      <div
        className="absolute bottom-0 left-0 right-0 pt-6 px-8 lg:px-10 pb-6 lg:pb-8 z-10"
        style={{
          background:
            'linear-gradient(to top, rgba(239,238,236,1) 60%, rgba(239,238,236,0) 100%)',
        }}
      >
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
            className="flex-1 border-0 outline-none font-sans text-[0.95rem] bg-transparent min-w-0 disabled:opacity-60 placeholder:text-[var(--ink-color)]/30 text-[var(--ink-color)]"
            aria-label={inputAriaLabel}
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
    </div>
  );
}
