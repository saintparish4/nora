'use client';

import Image from 'next/image';

export interface MarqueeItem {
  name: string;
  logo: string;
}

/**
 * Trust row.
 *
 * CSS animation rather than GSAP: it runs on the compositor, never touches the
 * main thread, and pauses on hover so a visitor can actually read a logo they
 * recognise. `motion-reduce` stops it outright — a permanently sliding strip is
 * exactly the kind of thing the setting exists for.
 */
export function Marquee({ items }: { items: MarqueeItem[] }) {
  return (
    <div className="group relative w-full overflow-hidden">
      {/* Feathered edges so logos arrive and leave rather than being cut. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[var(--bg-color)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[var(--bg-color)] to-transparent" />

      <div className="flex w-max animate-logo-marquee items-center group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="flex shrink-0 items-center gap-16 pr-16 sm:gap-20 sm:pr-20"
            aria-hidden={copy === 1}
          >
            {items.map((item) => (
              <div
                key={`${copy}-${item.name}`}
                className="flex h-10 shrink-0 items-center justify-center opacity-60 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0 sm:h-12"
              >
                <Image
                  src={item.logo}
                  alt={copy === 0 ? item.name : ''}
                  width={220}
                  height={64}
                  className="h-full w-auto max-w-[180px] object-contain sm:max-w-[200px]"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
