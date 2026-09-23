'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';

import { registerGsap, prefersReducedMotion } from '@/lib/motion/gsap';

type Variant = 'solid' | 'outline';

interface MagneticButtonProps {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
  /** Rendered after the label; the arrow slides on hover. */
  withArrow?: boolean;
}

const PULL_STRENGTH = 0.32;
const PULL_RADIUS = 1.6;

/**
 * The site's primary call to action.
 *
 * Three things happen on hover, and each is doing a job rather than decorating:
 *
 * 1. **Magnetic pull.** The button leans toward the cursor, which makes it feel
 *    like it wants to be pressed and widens the effective target.
 * 2. **Directional fill.** The wash enters from whichever edge the cursor
 *    crossed, so the motion agrees with the gesture instead of fighting it.
 *    This is the detail that separates a considered button from a default one.
 * 3. **Label swap.** The label slides up while a copy rises into its place, so
 *    the text stays legible against the moving fill rather than fading through it.
 *
 * All three collapse to a plain colour change under `prefers-reduced-motion`.
 */
export function MagneticButton({
  href,
  children,
  variant = 'solid',
  className = '',
  withArrow = false,
}: MagneticButtonProps) {
  const rootRef = useRef<HTMLAnchorElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const fill = fillRef.current;
    if (!root || !fill || prefersReducedMotion()) return;

    const gsap = registerGsap();

    const context = gsap.context(() => {
      const moveX = gsap.quickTo(root, 'x', { duration: 0.5, ease: 'power3.out' });
      const moveY = gsap.quickTo(root, 'y', { duration: 0.5, ease: 'power3.out' });

      // Which edge did the cursor cross? Compare the entry point against the
      // button's centre and pick the dominant axis.
      const edgeFor = (event: PointerEvent, rect: DOMRect) => {
        const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
        const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
        if (Math.abs(offsetX) > Math.abs(offsetY)) {
          return offsetX < 0 ? { x: '-100%', y: '0%' } : { x: '100%', y: '0%' };
        }
        return offsetY < 0 ? { x: '0%', y: '-100%' } : { x: '0%', y: '100%' };
      };

      const onEnter = (event: PointerEvent) => {
        const rect = root.getBoundingClientRect();
        gsap.set(fill, edgeFor(event, rect));
        gsap.to(fill, { x: '0%', y: '0%', duration: 0.45, ease: 'power3.out' });
      };

      const onLeave = (event: PointerEvent) => {
        const rect = root.getBoundingClientRect();
        // Leave by the edge the cursor actually exits through, so the fill
        // follows the hand rather than snapping back the way it came.
        gsap.to(fill, { ...edgeFor(event, rect), duration: 0.4, ease: 'power3.in' });
        moveX(0);
        moveY(0);
      };

      const onMove = (event: PointerEvent) => {
        const rect = root.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        moveX(dx * PULL_STRENGTH);
        moveY(dy * PULL_STRENGTH);
      };

      // Track slightly outside the bounds so the pull begins before the cursor
      // technically arrives — that anticipation is most of the effect.
      const onWindowMove = (event: PointerEvent) => {
        const rect = root.getBoundingClientRect();
        const withinX = Math.abs(event.clientX - (rect.left + rect.width / 2)) < rect.width * PULL_RADIUS;
        const withinY = Math.abs(event.clientY - (rect.top + rect.height / 2)) < rect.height * PULL_RADIUS * 2;
        if (withinX && withinY) onMove(event);
      };

      root.addEventListener('pointerenter', onEnter);
      root.addEventListener('pointerleave', onLeave);
      window.addEventListener('pointermove', onWindowMove, { passive: true });

      return () => {
        root.removeEventListener('pointerenter', onEnter);
        root.removeEventListener('pointerleave', onLeave);
        window.removeEventListener('pointermove', onWindowMove);
      };
    }, root);

    return () => context.revert();
  }, []);

  const solid = variant === 'solid';

  return (
    <Link
      ref={rootRef}
      href={href}
      className={[
        'group relative inline-flex items-center justify-center gap-2 overflow-hidden',
        'rounded-full px-7 py-3.5 text-[0.95rem] font-medium no-underline',
        'transition-colors duration-300 will-change-transform',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ink-color)]',
        solid
          ? 'bg-[var(--ink-color)] text-[var(--bg-color)]'
          : 'border border-[var(--ink-color)]/25 text-[var(--ink-color)] hover:border-[var(--ink-color)]/50',
        className,
      ].join(' ')}
    >
      {/* The directional wash. Sits under the label, above the base colour. */}
      <span
        ref={fillRef}
        aria-hidden
        className={[
          'pointer-events-none absolute inset-0 -z-0 translate-y-full',
          solid ? 'bg-[var(--bg-color)]' : 'bg-[var(--ink-color)]',
        ].join(' ')}
      />

      {/* Label and its understudy. The pair slides as one. */}
      <span className="relative z-10 block overflow-hidden">
        <span
          className={[
            'block transition-transform duration-[450ms] ease-[cubic-bezier(0.65,0,0.35,1)]',
            'group-hover:-translate-y-full motion-reduce:transition-none motion-reduce:group-hover:translate-y-0',
            solid ? 'group-hover:text-[var(--ink-color)]' : 'group-hover:text-[var(--bg-color)]',
          ].join(' ')}
        >
          {children}
        </span>
        <span
          aria-hidden
          className={[
            'absolute inset-0 block translate-y-full transition-transform duration-[450ms] ease-[cubic-bezier(0.65,0,0.35,1)]',
            'group-hover:translate-y-0 motion-reduce:hidden',
            solid ? 'text-[var(--ink-color)]' : 'text-[var(--bg-color)]',
          ].join(' ')}
        >
          {children}
        </span>
      </span>

      {withArrow && (
        <svg
          aria-hidden
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={[
            'relative z-10 transition-transform duration-[450ms] ease-[cubic-bezier(0.65,0,0.35,1)]',
            'group-hover:translate-x-1 motion-reduce:transition-none',
            solid ? 'group-hover:text-[var(--ink-color)]' : 'group-hover:text-[var(--bg-color)]',
          ].join(' ')}
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      )}
    </Link>
  );
}
