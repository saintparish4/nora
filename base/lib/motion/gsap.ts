'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * One place to register GSAP plugins.
 *
 * Registration has to happen in the browser: ScrollTrigger touches `window` on
 * import, and Next renders these pages on the server first. Calling this more
 * than once is harmless — gsap.registerPlugin is idempotent — so components can
 * call it freely rather than coordinating.
 */
let registered = false;

export function registerGsap(): typeof gsap {
  if (typeof window !== 'undefined' && !registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return gsap;
}

export { gsap, ScrollTrigger };

/**
 * Whether this visitor has asked for less movement.
 *
 * Read directly rather than through a hook in places that run inside a GSAP
 * context, where a React render is not available. `prefers-reduced-motion` is
 * not a nicety here: vestibular disorders are a medical condition, and this is
 * a medical product. Every animation in the redesign has a still equivalent.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
