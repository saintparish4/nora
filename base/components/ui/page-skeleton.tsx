import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[var(--glass-border)] space-y-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function AppointmentCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-[var(--glass-border)]">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div className="flex gap-4">
          <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
}

export function AppointmentsPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 pb-16">
      <div className="mb-8">
        <Skeleton className="h-9 w-52 mb-2" />
        <Skeleton className="h-5 w-72" />
      </div>
      <div className="mb-12">
        <Skeleton className="h-7 w-32 mb-6" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <AppointmentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProviderDetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 pb-16">
      <div className="max-w-7xl mx-auto w-full">
        <div className="bg-white rounded-2xl p-6 mb-8 border border-[var(--glass-border)]">
          <div className="flex flex-col md:flex-row gap-6">
            <Skeleton className="w-24 h-24 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-80" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-7 w-24" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[var(--glass-border)]">
          <Skeleton className="h-7 w-48 mb-6" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
            <div className="md:col-span-2">
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
