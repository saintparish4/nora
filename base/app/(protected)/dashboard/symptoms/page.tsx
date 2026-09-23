'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';
import { mutate } from 'swr';
import { History, RotateCcw } from 'lucide-react';
import {
  SymptomChatPanel,
  type SymptomChatPanelHandle,
} from '@/components/chat/symptom-chat-panel';
import { Button } from '@/components/ui/button';
import type { ChatProvider } from '@/types';

/**
 * In-product symptom checker.
 *
 * Same conversation engine as the public analyzer on `/technology`, with two
 * differences that only apply to a signed-in patient: the backend binds the
 * conversation to their account (so it shows up under History and gets a risk
 * assessment recorded), and booking goes straight to Get Care instead of
 * detouring through login.
 */
export default function SymptomsPage() {
  const router = useRouter();
  const chatRef = useRef<SymptomChatPanelHandle | null>(null);

  const handleBookProvider = useCallback(
    (provider: ChatProvider) => {
      router.push(
        `/dashboard/get-care?specialty=${encodeURIComponent(
          provider.specialty
        )}&provider_id=${provider.id}`
      );
    },
    [router]
  );

  // A completed analysis writes a new conversation + risk assessment, so the
  // history list in cache is now stale.
  const handleAnalysisComplete = useCallback(() => {
    mutate('conversations');
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            AI Symptom Checker
          </h1>
          <p className="text-muted-foreground">
            Describe what you&apos;re feeling. We&apos;ll suggest the right kind of
            specialist and show you who&apos;s available.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/symptoms/history">
              <History className="h-4 w-4" aria-hidden="true" />
              History
            </Link>
          </Button>
          <Button variant="outline" onClick={() => chatRef.current?.reset()}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            New session
          </Button>
        </div>
      </div>

      <div
        className="relative bg-surface-elevated border border-border rounded-2xl shadow-sm overflow-hidden"
        style={{ height: 'min(70vh, 640px)' }}
      >
        <SymptomChatPanel
          ref={chatRef}
          className="absolute inset-0"
          onBook={handleBookProvider}
          onAnalysisComplete={handleAnalysisComplete}
          inputAriaLabel="Describe your symptoms"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        This is not a diagnosis. If you think you&apos;re having a medical
        emergency, call 911.
      </p>
    </div>
  );
}
