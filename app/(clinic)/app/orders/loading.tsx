import {
  SkeletonPageHeader,
  SkeletonTable,
} from '@/components/ui/skeleton';

export default function OrdersLoading() {
  return (
    <section className="space-y-8">
      {/* Page Header */}
      <SkeletonPageHeader showAction />

      {/* Quick Reorder Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-6 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="h-9 w-16 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <SkeletonTable rows={8} columns={6} />
      </div>
    </section>
  );
}

