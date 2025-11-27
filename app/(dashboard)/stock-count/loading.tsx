import { SkeletonPageHeader, SkeletonTable, Skeleton } from '@/components/ui/skeleton';

export default function StockCountLoading() {
  return (
    <section className="space-y-8">
      {/* Page Header */}
      <SkeletonPageHeader showAction />

      {/* Active Counts Section */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-36" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-24 rounded-xl" />
                  <Skeleton className="h-9 w-20 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completed Counts Section */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-44" />
        <SkeletonTable rows={5} columns={5} />
      </div>
    </section>
  );
}

