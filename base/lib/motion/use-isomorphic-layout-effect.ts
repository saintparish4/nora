'use client';

import { useEffect, useLayoutEffect } from 'react';

/**
 * useLayoutEffect in the browser, useEffect on the server.
 *
 * Animations that start from a hidden state have to apply that state before
 * the browser paints, or the content flashes in and then jumps away. Plain
 * useLayoutEffect would log a warning during SSR, so swap it out there — where
 * it would do nothing useful anyway.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
