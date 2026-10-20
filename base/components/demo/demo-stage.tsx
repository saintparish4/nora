import { DemoBannerFrame } from '@/components/dashboard/demo-banner';
import { NoraLogo } from '@/components/navigation/nora-logo';
import { RequestSkeleton, TodaySkeleton } from '@/components/workspace/screen-skeletons';

export type DemoScreen = 'request' | 'today';

/**
 * What /demo shows while it wakes the API and signs in: the workspace's own
 * frame (demo banner, nav, main column) holding a skeleton of the screen the
 * visitor is about to land on, with the start-up log on top. When the real
 * screen arrives it takes the same places, so the wait and the page read as
 * one screen filling in rather than a loading page followed by another.
 */
export function DemoStage({ screen, role, children }: {
  screen: DemoScreen;
  /** Who the visitor is signing in as, or null before that is known. */
  role: 'staff' | 'clinician' | null;
  children: React.ReactNode;
}) {
  const label = role === 'clinician' ? 'clinician' : 'medical assistant';
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <DemoBannerFrame
        who={role ? <>Signing you in as the {label}.</> : <>Opening the demo practice.</>}
        other={role === 'clinician' ? 'staff' : 'clinician'}
      />
      <div className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-[1200px] items-center gap-6 px-5 sm:px-8">
          <NoraLogo />
          <div className="hidden flex-1 items-center gap-3 md:flex" aria-hidden>
            {[16, 24, 18, 14, 18].map((w, i) => (
              <span key={i} className="h-4 animate-pulse rounded-full bg-tile-strong" style={{ width: `${w * 4}px` }} />
            ))}
          </div>
          {/* The phone menu button's place. */}
          <span className="ml-auto size-10 animate-pulse rounded-full bg-tile-strong md:hidden" aria-hidden />
        </div>
      </div>
      <main id="main-content" className="relative mx-auto w-full max-w-[1200px] flex-1 px-5 pt-8 sm:px-8 sm:pt-10">
        <div aria-hidden>{screen === 'request' ? <RequestSkeleton label="" /> : <TodaySkeleton label="" />}</div>
        <div className="absolute inset-x-5 top-8 z-10 flex justify-center sm:inset-x-8 sm:top-10">
          <div className="w-full max-w-[520px] space-y-4 rounded-tile border border-border bg-background p-4 sm:p-5">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
