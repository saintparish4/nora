'use client';

import Link from 'next/link';

import { NoraLogo } from '@/components/navigation/nora-logo';
import { MobileMenu } from '@/components/marketing/mobile-menu';

export const MARKETING_NAV = [
  { href: '/specialists', label: 'Specialists' },
  { href: '/locations', label: 'Locations' },
  { href: '/technology', label: 'SymptomX' },
] as const;

/**
 * The header for every public page.
 *
 * Shared rather than copied per page, which is how the old landing page and
 * /technology drifted into two different navs with two different breakpoints —
 * and how one of them ended up with no mobile menu at all.
 */
export function SiteHeader({ className = '' }: { className?: string }) {
  return (
    <header
      className={[
        'relative z-20 mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 py-6 lg:px-10',
        className,
      ].join(' ')}
    >
      <NoraLogo />

      <nav className="absolute left-1/2 hidden -translate-x-1/2 gap-9 lg:flex">
        {MARKETING_NAV.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="nav-item-underline relative text-[0.9rem] text-[var(--ink-color)]/65 no-underline transition-colors duration-300 hover:text-[var(--ink-color)]"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="hidden rounded-full border border-[var(--ink-color)]/25 px-5 py-2.5 text-[0.88rem] text-[var(--ink-color)] no-underline transition-all duration-300 hover:border-[var(--ink-color)] hover:bg-[var(--ink-color)] hover:text-[var(--bg-color)] sm:inline-flex"
        >
          Patient login
        </Link>
        <MobileMenu links={[...MARKETING_NAV]} />
      </div>
    </header>
  );
}
