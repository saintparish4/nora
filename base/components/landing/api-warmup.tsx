'use client';

import { useEffect } from 'react';
import { warmApi } from '@/lib/api/health';

/**
 * Starts the sleeping demo API booting while the visitor reads the landing
 * page, so the demo is usually awake by the time they click through.
 */
export function ApiWarmup() {
  useEffect(() => warmApi(), []);
  return null;
}
