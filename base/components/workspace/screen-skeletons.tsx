import { cn } from '@/lib/utils';

/**
 * Placeholders shaped like the screens they stand in for, so the real screen
 * replaces them in place instead of rearranging the page. `data-screen` names
 * which screen; the demo's start-up log sits over the same shapes.
 */

const bar = 'rounded-full bg-tile-strong';

function SkeletonPanel({ className, rows = 0, title = true }: { className?: string; rows?: number; title?: boolean }) {
  return (
    <div className={cn('rounded-tile bg-tile p-5 sm:p-6', className)}>
      {title && <div className={cn(bar, 'mb-5 h-5 w-32')} />}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="mb-3 rounded-2xl px-3 py-2.5">
          <div className={cn(bar, 'h-4 w-full')} />
          <div className={cn(bar, 'mt-2 h-4 w-2/3')} />
          <div className={cn(bar, 'mt-2.5 h-5 w-14 bg-white')} />
        </div>
      ))}
    </div>
  );
}

/** The prior authorization screen: header, extraction banner, requirements, side panels. */
export function RequestSkeleton({ label = 'Loading the request' }: { label?: string }) {
  return (
    <div data-screen="request" role="status" aria-label={label} className="animate-pulse">
      <div className="mb-8 pt-2 sm:mb-10">
        <div className={cn(bar, 'mb-3 h-5 w-36')} />
        <div className={cn(bar, 'h-9 w-64 max-w-full sm:h-11 sm:w-96')} />
        <div className={cn(bar, 'mt-3 h-5 w-[30rem] max-w-full')} />
      </div>
      <div className="mb-4 h-[88px] rounded-tile bg-tile" />
      <div className="mb-6 h-[72px] rounded-tile bg-tile" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-6 md:grid-cols-[272px_minmax(0,1fr)]">
          <SkeletonPanel rows={6} className="self-start" />
          <div className="space-y-6">
            <SkeletonPanel className="h-[30rem]" />
            <SkeletonPanel className="h-40" />
          </div>
        </div>
        <div className="space-y-6">
          <SkeletonPanel className="h-36" />
          <SkeletonPanel className="h-32" />
          <SkeletonPanel className="h-40" />
        </div>
      </div>
    </div>
  );
}

/** Today: header, five count tiles, two panels. */
export function TodaySkeleton({ label = 'Loading' }: { label?: string }) {
  return (
    <div data-screen="today" role="status" aria-label={label} className="animate-pulse pt-2">
      <div className={cn(bar, 'mb-3 h-10 w-56')} />
      <div className={cn(bar, 'mb-10 h-4 w-72')} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-tile bg-tile last:col-span-2 md:last:col-span-1" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="h-[28rem] rounded-tile bg-tile" />
        <div className="h-[28rem] rounded-tile bg-tile" />
      </div>
    </div>
  );
}
