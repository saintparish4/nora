'use client';

import { useRef, type ElementType, type ReactNode } from 'react';

import { registerGsap, prefersReducedMotion } from '@/lib/motion/gsap';
import { useIsomorphicLayoutEffect } from '@/lib/motion/use-isomorphic-layout-effect';

/**
 * Reveal primitives for the marketing pages.
 *
 * One rule governs both of these: **the content is visible in the markup, and
 * only JavaScript ever hides it.** The obvious implementation — render at
 * opacity 0, animate to 1 on a ScrollTrigger — quietly makes the whole page
 * depend on GSAP loading, a trigger firing, and the visitor not having asked
 * for reduced motion. Any one of those failing leaves a blank page, which on a
 * health site is worse than having no animation at all.
 *
 * So the from-state is applied inside a layout effect, before paint, and only
 * once we know the animation will actually run.
 *
 * `immediate` exists because ScrollTrigger is the wrong tool above the fold:
 * an element already past its start threshold at load is a race, and losing it
 * means the hero never appears.
 */

interface RevealTextProps {
  /** Plain text. Split per word, so keep markup out of it. */
  children: string;
  as?: ElementType;
  className?: string;
  delay?: number;
  /** Play on mount rather than on scroll. Use for anything above the fold. */
  immediate?: boolean;
}

export function RevealText({
  children,
  as: Tag = 'span',
  className = '',
  delay = 0,
  immediate = false,
}: RevealTextProps) {
  const rootRef = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const gsap = registerGsap();
    const words = root.querySelectorAll<HTMLElement>('[data-reveal-word]');
    if (words.length === 0) return;

    const context = gsap.context(() => {
      gsap.set(words, { yPercent: 115 });
      gsap.to(words, {
        yPercent: 0,
        duration: 1,
        delay,
        ease: 'expo.out',
        stagger: 0.055,
        ...(immediate
          ? {}
          : { scrollTrigger: { trigger: root, start: 'top 90%', once: true } }),
      });
    }, root);

    return () => context.revert();
  }, [children, delay, immediate]);

  const words = children.split(' ');

  return (
    <Tag ref={rootRef} className={className}>
      {/* The sentence, whole, for assistive technology. The split copy below is
          decorative and hidden from it — screen readers should not hear a
          headline arrive one word at a time. */}
      <span className="sr-only">{children}</span>
      <span aria-hidden className="inline">
        {words.map((word, index) => (
          <span key={`${word}-${index}`} className="inline-block overflow-hidden align-bottom">
            <span data-reveal-word className="inline-block will-change-transform">
              {word}
            </span>
            {index < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </Tag>
  );
}

interface FadeUpProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Distance travelled, in pixels. Keep it small; this is punctuation. */
  distance?: number;
  /** Play on mount rather than on scroll. Use for anything above the fold. */
  immediate?: boolean;
}

/** Quiet entrance for everything that is not a headline. */
export function FadeUp({
  children,
  className = '',
  delay = 0,
  distance = 18,
  immediate = false,
}: FadeUpProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const gsap = registerGsap();

    const context = gsap.context(() => {
      gsap.set(root, { opacity: 0, y: distance });
      gsap.to(root, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        delay,
        ease: 'power3.out',
        ...(immediate
          ? {}
          : { scrollTrigger: { trigger: root, start: 'top 92%', once: true } }),
      });
    }, root);

    return () => context.revert();
  }, [delay, distance, immediate]);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
