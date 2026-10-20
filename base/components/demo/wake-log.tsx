'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type WakeLineTone = 'command' | 'step' | 'detail' | 'done' | 'fail';

export interface WakeLine {
  id: number;
  tone: WakeLineTone;
  text: string;
  /** Set while the line's request is still out; the line counts up from here. */
  pendingSince?: number;
}

const MARKS: Record<WakeLineTone, string> = {
  command: '$',
  step: '→',
  detail: ' ',
  done: '✓',
  fail: '✗',
};

const MARK_COLOURS: Record<WakeLineTone, string> = {
  command: 'text-ink',
  step: 'text-blue-deep',
  detail: 'text-muted-foreground',
  done: 'text-green-deep',
  fail: 'text-orange-deep',
};

export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * The demo page's progress, written like a terminal session. Every line is
 * something that actually happened (a probe, a sign-in), so a slow start reads
 * as work in progress rather than a stuck spinner.
 */
export function WakeLog({ lines }: { lines: WakeLine[] }) {
  const [now, setNow] = useState(() => Date.now());
  const pending = lines.some(line => line.pendingSince !== undefined);

  useEffect(() => {
    if (!pending) return;
    const tick = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(tick);
  }, [pending]);

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Demo start-up"
      className="max-h-72 overflow-y-auto rounded-xl border border-border bg-background px-4 py-3.5 font-mono text-[0.8125rem] leading-6 text-body"
    >
      {lines.map(line => (
        <p key={line.id} className={cn('flex gap-2', line.tone === 'detail' && 'pl-4 text-muted-foreground')}>
          {line.tone !== 'detail' && (
            <span className={cn('w-3 shrink-0 font-semibold', MARK_COLOURS[line.tone])} aria-hidden>
              {MARKS[line.tone]}
            </span>
          )}
          <span className={cn('min-w-0 break-words', line.tone === 'command' && 'text-ink')}>
            {line.text}
            {line.pendingSince !== undefined && (
              <span className="text-muted-foreground"> … {formatSeconds(Math.max(0, now - line.pendingSince))}</span>
            )}
          </span>
        </p>
      ))}
      {pending && <span className="ml-5 inline-block h-4 w-2 animate-pulse bg-ink align-middle" aria-hidden />}
    </div>
  );
}
