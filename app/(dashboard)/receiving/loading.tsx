import { SkeletonPageHeader, SkeletonTable, Skeleton } from '@/components/ui/skeleton';

export default function ReceivingLoading() {
  return (
    <section className="space-y-8">
      {/* Page Header */}
      <SkeletonPageHeader showAction />

      {/* Info Banner */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-start gap-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>

      {/* Pending Receipts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <SkeletonTable rows={5} columns={5} />
      </div>

      {/* Recent Receipts Section */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-36" />
        <SkeletonTable rows={3} columns={5} />
      </div>
    </section>
  );
}

