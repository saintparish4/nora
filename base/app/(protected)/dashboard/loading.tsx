export default function DashboardLoading() {
  return (
    <div className="py-8 animate-pulse" aria-label="Loading…" role="status">
      {/* Page title skeleton */}
      <div className="h-8 w-48 rounded-lg bg-[var(--ink-color)] opacity-[0.07] mb-2" />
      <div className="h-4 w-72 rounded-lg bg-[var(--ink-color)] opacity-[0.05] mb-10" />

      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-white/20 h-28"
          />
        ))}
      </div>

      {/* Content rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-white/20 h-64" />
        <div className="rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-white/20 h-64" />
      </div>
    </div>
  );
}
