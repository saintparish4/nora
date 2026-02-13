import Link from 'next/link';

/**
 * Standard 404 page for unmatched routes. Uses Aura design system
 * (beam, noise overlay, serif/sans typography) and offers clear
 * navigation back to home, specialists, and login.
 */
export default function NotFound() {
  return (
    <>
      <div className="noise-overlay" aria-hidden />

      <div className="flex min-h-screen w-full max-w-[1200px] mx-auto px-6 flex-col relative z-[2]">
        <nav className="flex justify-between items-center py-8">
          <Link
            href="/"
            className="font-serif text-2xl italic flex items-center gap-3 no-underline text-[var(--ink-color)]"
          >
            <span className="w-px h-6 bg-[var(--ink-color)] rotate-[15deg]" aria-hidden />
            aura.ai
          </Link>
        </nav>

        <main className="flex-1 flex flex-col items-center justify-center text-center relative">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] h-[70vh] -z-[1] pointer-events-none"
            aria-hidden
          >
            <div
              className="w-full h-full aura-beam rounded-full"
              style={{
                filter: 'blur(50px)',
                opacity: 0.7,
                background:
                  'linear-gradient(180deg, rgba(255,156,107,0) 0%, rgba(255,156,107,0.6) 50%, rgba(224,242,194,0.6) 100%)',
              }}
            />
          </div>

          <div
            className="inline-flex items-center gap-2 py-1.5 px-4 rounded-[20px] text-xs font-semibold mb-6 border border-[rgba(255,156,107,0.2)]"
            style={{
              background: 'rgba(255, 156, 107, 0.1)',
              color: '#C27045',
            }}
          >
            <span className="animate-aura-pulse w-2 h-2 rounded-full bg-[var(--beam-start)]" />
            SYSTEM STATUS: PAGE NOT FOUND
          </div>

          <div className="font-serif text-[8rem] italic leading-none mb-4 opacity-90 text-[var(--ink-color)] max-[768px]:text-[5rem]">
            404
          </div>
          <h1 className="font-serif text-[3.5rem] mb-6 max-w-[600px] text-[var(--ink-color)] max-[768px]:text-[2.5rem]">
            A drift in the data.
          </h1>
          <p className="text-[1.1rem] leading-relaxed max-w-[480px] opacity-70 mb-12 text-[var(--ink-color)]">
            The path you&apos;re looking for seems to have faded. Even the most precise systems
            occasionally find a gap in the records.
          </p>

          <div
            className="w-px h-[60px] bg-[var(--ink-color)] opacity-20 mb-10"
            aria-hidden
          />

          <nav
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-[600px]"
            aria-label="Quick navigation"
          >
            <Link
              href="/"
              className="feature-card-hover p-6 border border-[var(--glass-border)] rounded-[var(--radius-card)] bg-white/20 backdrop-blur-[10px] no-underline text-[var(--ink-color)] flex flex-col items-center gap-3 transition-all duration-300 hover:-translate-y-1"
            >
              <span className="text-xl w-8 h-8 border border-[var(--ink-color)] rounded-full flex items-center justify-center">
                ✦
              </span>
              <span className="text-sm font-medium uppercase tracking-wider">
                Return Home
              </span>
            </Link>
            <Link
              href="/specialists"
              className="feature-card-hover p-6 border border-[var(--glass-border)] rounded-[var(--radius-card)] bg-white/20 backdrop-blur-[10px] no-underline text-[var(--ink-color)] flex flex-col items-center gap-3 transition-all duration-300 hover:-translate-y-1"
            >
              <span className="text-xl w-8 h-8 border border-[var(--ink-color)] rounded-full flex items-center justify-center">
                ○
              </span>
              <span className="text-sm font-medium uppercase tracking-wider">
                Find Specialists
              </span>
            </Link>
            <Link
              href="/login"
              className="feature-card-hover p-6 border border-[var(--glass-border)] rounded-[var(--radius-card)] bg-white/20 backdrop-blur-[10px] no-underline text-[var(--ink-color)] flex flex-col items-center gap-3 transition-all duration-300 hover:-translate-y-1"
            >
              <span className="text-xl w-8 h-8 border border-[var(--ink-color)] rounded-full flex items-center justify-center">
                →
              </span>
              <span className="text-sm font-medium uppercase tracking-wider">
                Patient Login
              </span>
            </Link>
          </nav>
        </main>
      </div>
    </>
  );
}
