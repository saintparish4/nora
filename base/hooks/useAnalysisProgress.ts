import { useState, useEffect, useRef } from 'react';

const MESSAGES = [
  'Reading your symptoms…',
  'Analyzing patterns…',
  'Matching specialists…',
  'Preparing your recommendations…',
] as const;

const INTERVAL_MS = 2000;

/**
 * Cycles through informative progress messages every 2 seconds while `active`
 * is true. Resets to the first message when deactivated, so the next analysis
 * starts fresh.
 */
export function useAnalysisProgress(active: boolean): string {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }

    const schedule = (i: number) => {
      if (i >= MESSAGES.length - 1) return;
      timerRef.current = setTimeout(() => {
        setIndex(i + 1);
        schedule(i + 1);
      }, INTERVAL_MS);
    };

    schedule(0);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active]);

  return MESSAGES[index];
}
