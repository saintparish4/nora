import Link from 'next/link';
import { cn } from '@/lib/utils';

/** The Nora mark: four stacked bars, widening downward. */
export function NoraMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 26" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('h-6 w-[18px] shrink-0', className)} aria-hidden>
      <rect x="7" y="0" width="6" height="4" rx="2" fill="currentColor" />
      <rect x="5" y="6" width="10" height="5" rx="2.5" fill="currentColor" />
      <rect x="3.5" y="13" width="13" height="5" rx="2.5" fill="currentColor" />
      <rect x="1.5" y="20" width="17" height="6" rx="3" fill="currentColor" />
    </svg>
  );
}

/** Mark and wordmark, linked. Used in every header. */
export function NoraLogo({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label="Nora home"
      className={cn('inline-flex items-center gap-2 font-display text-[1.1875rem] font-semibold tracking-[-0.03em] text-ink no-underline', className)}
    >
      <NoraMark />
      Nora
    </Link>
  );
}
