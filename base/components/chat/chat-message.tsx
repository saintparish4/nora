'use client';

import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatRole = 'ai' | 'user';

export interface ChatMessageData {
  id: string;
  role: ChatRole;
  content: string;
}

// ---------------------------------------------------------------------------
// ChatMessage – single message bubble with entrance animation
// ---------------------------------------------------------------------------

interface ChatMessageProps {
  message: ChatMessageData;
  /** Stagger index – drives entrance animation delay */
  index?: number;
}

export function ChatMessage({ message, index = 0 }: ChatMessageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Trigger entrance after mount so the CSS transition fires
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const isAi = message.role === 'ai';

  return (
    <div
      ref={ref}
      className={`chat-msg flex flex-col gap-2 max-w-[80%] ${
        isAi ? 'self-start' : 'self-end items-end'
      }`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? 'translateY(0)'
          : `translateY(${isAi ? '12px' : '-12px'})`,
        transition: `opacity 0.4s cubic-bezier(0.22,1,0.36,1) ${index * 60}ms, transform 0.4s cubic-bezier(0.22,1,0.36,1) ${index * 60}ms`,
      }}
    >
      {/* AI avatar */}
      {isAi && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[0.75rem] mb-0.5 bg-white border border-[var(--glass-border)] shadow-organic-sm select-none">
          <span className="chat-avatar-icon">✦</span>
        </div>
      )}

      {/* Bubble */}
      <div
        className={`px-6 py-4 text-[0.95rem] leading-relaxed transition-shadow duration-300 ${
          isAi
            ? 'bg-white/90 backdrop-blur-sm border border-[var(--glass-border)] rounded-[20px] rounded-tl-md shadow-organic-sm hover:shadow-organic'
            : 'bg-[var(--ink-color)] text-[var(--bg-color)] rounded-[20px] rounded-tr-md shadow-organic-sm'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TypingIndicator – three bouncing dots
// ---------------------------------------------------------------------------

export function TypingIndicator() {
  return (
    <div className="chat-msg flex flex-col gap-2 max-w-[80%] self-start animate-fade-in">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[0.75rem] mb-0.5 bg-white border border-[var(--glass-border)] shadow-organic-sm select-none">
        <span className="chat-avatar-icon">✦</span>
      </div>
      <div className="inline-flex items-center gap-1.5 px-5 py-4 bg-white/90 backdrop-blur-sm border border-[var(--glass-border)] rounded-[20px] rounded-tl-md shadow-organic-sm">
        <span className="chat-typing-dot w-2 h-2 rounded-full bg-[var(--ink-color)] opacity-40" style={{ animationDelay: '0ms' }} />
        <span className="chat-typing-dot w-2 h-2 rounded-full bg-[var(--ink-color)] opacity-40" style={{ animationDelay: '160ms' }} />
        <span className="chat-typing-dot w-2 h-2 rounded-full bg-[var(--ink-color)] opacity-40" style={{ animationDelay: '320ms' }} />
      </div>
    </div>
  );
}
