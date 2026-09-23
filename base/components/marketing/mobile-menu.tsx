'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { registerGsap, prefersReducedMotion } from '@/lib/motion/gsap';

interface MobileMenuProps {
  links: { href: string; label: string }[];
}

/**
 * Navigation below the `lg` breakpoint, where the inline links are hidden.
 *
 * Built as a real dialog rather than a styled div: `aria-modal`, focus moved in
 * on open and restored on close, Escape to dismiss, and background scroll
 * locked. A menu that traps a patient on a page they cannot leave is a worse
 * failure than a plain one.
 *
 * The panel animates with GSAP when motion is allowed, and simply appears when
 * it is not.
 */
export function MobileMenu({ links }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    // Captured now rather than read in cleanup: by the time cleanup runs the
    // ref may point somewhere else, and focus would land in the wrong place.
    const trigger = triggerRef.current;

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      // Send focus back where it came from, rather than dropping it at the top
      // of the document.
      trigger?.focus();
    };
  }, [open]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel || prefersReducedMotion()) return;

    const gsap = registerGsap();

    const context = gsap.context(() => {
      gsap.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      gsap.fromTo(
        panel.querySelectorAll('[data-menu-item]'),
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, stagger: 0.06, ease: 'expo.out', delay: 0.05 }
      );
    }, panel);

    return () => context.revert();
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--ink-color)]/20 text-[var(--ink-color)] transition-colors duration-300 hover:border-[var(--ink-color)]/50 lg:hidden"
      >
        <span className="sr-only">Open menu</span>
        <svg aria-hidden width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M0 1h16M0 6h16M0 11h16" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-color)] lg:hidden"
        >
          <div className="flex items-center justify-between px-6 py-6">
            <span className="text-[0.62rem] uppercase tracking-[0.24em] text-[var(--ink-color)]/40">
              Menu
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--ink-color)]/20 transition-colors duration-300 hover:border-[var(--ink-color)]/50"
            >
              <span className="sr-only">Close menu</span>
              <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
          </div>

          <nav className="flex flex-1 flex-col justify-center gap-2 px-6 pb-24">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                data-menu-item
                className="border-b border-[var(--ink-color)]/8 py-5 font-serif text-[2rem] leading-tight tracking-[-0.02em] text-[var(--ink-color)] no-underline"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              data-menu-item
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[var(--ink-color)] px-6 py-4 text-[0.95rem] text-[var(--bg-color)] no-underline"
            >
              Patient login
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
