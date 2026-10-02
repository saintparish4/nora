import Link from 'next/link';
import { NoraLogo } from '@/components/navigation/nora-logo';
import { GapShape } from '@/components/landing/hero-art';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="mx-auto flex h-[72px] w-full max-w-[1024px] items-center px-5 sm:px-8">
        <NoraLogo />
      </header>
      <main id="main-content" className="flex flex-1 flex-col items-center justify-center px-5 pb-24 text-center">
        <GapShape className="mb-8 w-32" />
        <p className="text-[0.9375rem] font-semibold text-orange-deep">404</p>
        <h1 className="mt-2 text-[2.5rem] leading-[1.06] tracking-[-0.035em] sm:text-[3.5rem]">Nothing at this address.</h1>
        <p className="mt-4 max-w-[26rem] text-[1.0625rem] leading-[1.55] text-body">
          The page may have moved, or the link may be wrong. Records in Nora are only visible to the practice that
          owns them.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex h-12 items-center rounded-full bg-primary px-6 text-[1.0625rem] font-medium text-primary-foreground hover:bg-[#2b2b2b]">
            Back to the start
          </Link>
          <Link href="/dashboard" className="inline-flex h-12 items-center rounded-full bg-tile-strong px-6 text-[1.0625rem] font-medium text-ink hover:bg-tile-hover">
            Open the workspace
          </Link>
        </div>
      </main>
    </div>
  );
}
