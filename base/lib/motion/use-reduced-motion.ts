'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Tracks `prefers-reduced-motion`, including changes made while the page is open.
 *
 * useSyncExternalStore rather than useState + useEffect: a media query is an
 * external store, and this is what React provides for reading one. It also
 * gives an explicit server snapshot, so there is no render-then-correct flash
 * and no hydration mismatch on pages that animate.
 *
 * This is not a nicety. Vestibular disorders are a medical condition and this
 * is a medical product; every animation on the marketing site has a still
 * equivalent behind this hook or the `motion-reduce:` Tailwind variant.
 */
function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};

  const query = window.matchMedia(QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/** The server has no media queries; assume motion is allowed and correct on hydration. */
function getServerSnapshot(): boolean {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
