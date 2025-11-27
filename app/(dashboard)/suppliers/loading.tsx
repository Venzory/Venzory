import { SkeletonPageHeader, Skeleton, SkeletonCard } from '@/components/ui/skeleton';

export default function SuppliersLoading() {
  return (
    <section className="space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>

      {/* Supplier Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-9 w-20 rounded-xl" />
                <Skeleton className="h-9 w-20 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

