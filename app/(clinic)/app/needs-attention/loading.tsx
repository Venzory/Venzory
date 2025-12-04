import { SkeletonPageHeader, SkeletonCard, Skeleton } from '@/components/ui/skeleton';

export default function NeedsAttentionLoading() {
  return (
    <section className="space-y-8">
      {/* Page Header */}
      <SkeletonPageHeader showAction={false} />

      {/* Attention Items */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-9 w-24 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

