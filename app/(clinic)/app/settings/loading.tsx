import {
  SkeletonPageHeader,
  Skeleton,
  SkeletonTable,
} from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <section className="space-y-8">
      {/* Page Header */}
      <SkeletonPageHeader showAction={false} />

      {/* Practice Settings Section */}
      <div className="space-y-6">
        <Skeleton className="h-7 w-40" />
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-11 w-32 rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Team Members Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-20" />
        </div>
        <SkeletonTable rows={4} columns={5} />
      </div>

      {/* Invite User Section */}
      <div className="space-y-6">
        <Skeleton className="h-7 w-28" />
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-11 w-32 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

