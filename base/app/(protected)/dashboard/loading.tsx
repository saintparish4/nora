export default function DashboardLoading() {
  return (
    <div className="animate-pulse pt-2" aria-label="Loading" role="status">
      <div className="mb-3 h-10 w-56 rounded-full bg-tile-strong" />
      <div className="mb-10 h-4 w-72 rounded-full bg-tile-strong" />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-tile bg-tile" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="h-64 rounded-tile bg-tile" />
        <div className="h-64 rounded-tile bg-tile" />
      </div>
    </div>
  );
}
