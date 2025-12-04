import { SkeletonPageHeader, SkeletonTable, Skeleton } from '@/components/ui/skeleton';

export default function ReorderSuggestionsLoading() {
  return (
    <section className="space-y-8">
      {/* Page Header */}
      <SkeletonPageHeader showAction />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Suggestions Table */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-48" />
        <SkeletonTable rows={8} columns={6} />
      </div>
    </section>
  );
}

