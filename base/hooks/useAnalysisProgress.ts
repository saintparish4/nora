import { useState, useEffect } from 'react';

const MESSAGES = [
  'Reading your symptoms…',
  'Analyzing patterns…',
  'Matching specialists…',
  'Preparing your recommendations…',
] as const;

const INTERVAL_MS = 2000;

/**
 * Cycles through informative progress messages every 2 seconds while `active`
 * is true. The returned message falls back to the first one whenever inactive,
 * so the next analysis always starts fresh.
 */
export function useAnalysisProgress(active: boolean): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = (i: number) => {
      if (i >= MESSAGES.length - 1) return;
      timer = setTimeout(() => {
        setIndex(i + 1);
        schedule(i + 1);
      }, INTERVAL_MS);
    };

    schedule(0);

    return () => {
      if (timer) clearTimeout(timer);
      // Rewind for the next activation. Runs on teardown rather than in the
      // effect body so it never triggers a cascading render.
      setIndex(0);
    };
  }, [active]);

  return active ? MESSAGES[index] : MESSAGES[0];
}
