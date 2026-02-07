'use client';

import Link from 'next/link';

/** Homepage nora.ai logo: stacked-bars icon + "nora.ai" text. Use in nav for consistency. */
export function NoraLogo({
  href = '/',
  className = 'font-serif text-[1.5rem] italic flex items-center gap-2 sm:gap-3 text-[var(--ink-color)] no-underline',
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={className} aria-label="nora.ai home">
      <svg
        width="20"
        height="28"
        viewBox="0 0 20 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-7 h-8 shrink-0"
        aria-hidden
      >
        <rect x="7" y="0" width="6" height="4" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="5" y="6" width="10" height="5" rx="2.5" fill="currentColor" opacity="0.75" />
        <rect x="4" y="12" width="12" height="5" rx="2.5" fill="currentColor" opacity="0.65" />
        <rect x="2" y="18" width="16" height="6" rx="3" fill="currentColor" />
      </svg>
      nora.ai
    </Link>
  );
}
