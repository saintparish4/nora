'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlertCircle, ArrowLeft, MessageSquare } from 'lucide-react';
import { useConversation, useConversations } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { CardSkeleton } from '@/components/ui/page-skeleton';
import { formatDateTime, getUrgencyColor } from '@/lib/format';
import type { ConversationSummary, RiskAssessment } from '@/types';

function CareLevelBadge({ assessment }: { assessment: RiskAssessment }) {
  const label =
    assessment.care_level.charAt(0).toUpperCase() + assessment.care_level.slice(1);

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(assessment.care_level)}`}
    >
      {label}
    </span>
  );
}

function ConversationRow({
  conversation,
  onOpen,
}: {
  conversation: ConversationSummary;
  onOpen: (id: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(conversation.id)}
      className="w-full text-left p-5 bg-surface-elevated border border-border rounded-2xl shadow-sm hover:border-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">
            {conversation.preview ?? 'Symptom check'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDateTime(conversation.created_at)} ·{' '}
            {conversation.message_count} message
            {conversation.message_count === 1 ? '' : 's'}
          </p>
        </div>
        {conversation.latest_risk_assessment && (
          <CareLevelBadge assessment={conversation.latest_risk_assessment} />
        )}
      </div>
    </button>
  );
}

function ConversationDetailView({
  id,
  onBack,
}: {
  id: number;
  onBack: () => void;
}) {
  const { data: conversation, isLoading, error } = useConversation(id);

  if (isLoading) return <CardSkeleton />;

  if (error || !conversation) {
    return (
      <div className="p-8 text-center bg-surface-elevated border border-border rounded-2xl">
        <AlertCircle
          className="h-10 w-10 text-gray-300 mx-auto mb-3"
          aria-hidden="true"
        />
        <p className="text-muted-foreground">
          We couldn&apos;t load this symptom check.
        </p>
        <Button variant="outline" className="mt-4" onClick={onBack}>
          Back to history
        </Button>
      </div>
    );
  }

  const latest = conversation.risk_assessments[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <p className="text-sm text-muted-foreground">
          {formatDateTime(conversation.created_at)}
        </p>
      </div>

      {latest && (
        <div className="p-5 bg-surface-elevated border border-border rounded-2xl shadow-sm">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs uppercase tracking-widest opacity-50 font-semibold">
              Assessment
            </span>
            <CareLevelBadge assessment={latest} />
            {latest.recommended_specialties.map((specialty) => (
              <span
                key={specialty}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-foreground/5"
              >
                {specialty}
              </span>
            ))}
          </div>
          {latest.reasoning && (
            <p className="text-sm text-muted-foreground">{latest.reasoning}</p>
          )}
          {latest.red_flags.length > 0 && (
            <ul className="mt-3 space-y-1">
              {latest.red_flags.map((flag) => (
                <li key={flag} className="text-sm text-red-700">
                  • {flag}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="p-5 bg-surface-elevated border border-border rounded-2xl shadow-sm space-y-4">
        <h2 className="text-sm uppercase tracking-widest opacity-50 font-semibold">
          Transcript
        </h2>
        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'user'
                ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-foreground text-background px-4 py-3'
                : 'mr-auto max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-4 py-3'
            }
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Past symptom checks for the signed-in patient, with the option to reopen any
 * one of them. Backed by the conversations the chat persists — guest checks on
 * the public analyzer never appear here because they have no account attached.
 */
export default function SymptomsHistoryPage() {
  const { data: conversations, isLoading, error } = useConversations();
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="flex flex-1 flex-col gap-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Symptom Check History
          </h1>
          <p className="text-muted-foreground">
            Every check you&apos;ve run while signed in, newest first.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/symptoms">New symptom check</Link>
        </Button>
      </div>

      {openId !== null ? (
        <ConversationDetailView id={openId} onBack={() => setOpenId(null)} />
      ) : isLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-surface-elevated border border-border rounded-2xl">
          <AlertCircle
            className="h-10 w-10 text-gray-300 mx-auto mb-3"
            aria-hidden="true"
          />
          <p className="text-muted-foreground">
            We couldn&apos;t load your history. Please try again.
          </p>
        </div>
      ) : !conversations || conversations.length === 0 ? (
        <div className="p-10 text-center bg-surface-elevated border border-border rounded-2xl">
          <MessageSquare
            className="h-10 w-10 text-gray-300 mx-auto mb-3"
            aria-hidden="true"
          />
          <p className="text-muted-foreground mb-4">
            You haven&apos;t run a symptom check yet.
          </p>
          <Button asChild>
            <Link href="/dashboard/symptoms">Start your first check</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              onOpen={setOpenId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
