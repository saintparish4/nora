export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg-color)] flex items-center justify-center">
      <div className="noise-overlay" />
      <div className="flex flex-col items-center gap-4 relative z-10">
        <div
          className="w-8 h-8 rounded-full animate-pulse"
          style={{ background: 'rgba(255, 156, 107, 0.6)' }}
        />
        <p className="text-[0.85rem] opacity-40 font-sans text-[var(--ink-color)]">
          Loading…
        </p>
      </div>
    </div>
  );
}
