export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Loading">
      <div className="flex items-center gap-2" aria-hidden>
        <span className="size-3 animate-pulse rounded-full bg-blue" />
        <span className="size-3 animate-pulse rounded-full bg-yellow [animation-delay:150ms]" />
        <span className="size-3 animate-pulse rounded-full bg-green [animation-delay:300ms]" />
      </div>
    </div>
  );
}
