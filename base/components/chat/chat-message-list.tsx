'use client';

import { useEffect, useRef } from 'react';
import {
  ChatMessage,
  TypingIndicator,
  type ChatMessageData,
} from './chat-message';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessageListProps {
  messages: ChatMessageData[];
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// ChatMessageList – scrollable container with auto-scroll & typing indicator
// ---------------------------------------------------------------------------

export function ChatMessageList({
  messages,
  isLoading = false,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Smooth-scroll to bottom whenever messages change or loading state changes
  useEffect(() => {
    const id = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 80);
    return () => clearTimeout(id);
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollRef}
      className="absolute inset-0 overflow-y-auto overscroll-contain p-8 lg:p-10 pb-[140px] flex flex-col gap-6"
      style={{ scrollbarGutter: 'stable' }}
    >
      {messages.map((msg, i) => (
        <ChatMessage key={msg.id} message={msg} index={i} />
      ))}

      {isLoading && <TypingIndicator />}

      {/* Invisible anchor for auto-scroll */}
      <div ref={bottomRef} className="h-px shrink-0" />
    </div>
  );
}
