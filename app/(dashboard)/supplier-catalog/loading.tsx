import { SkeletonPageHeader, SkeletonTable, Skeleton } from '@/components/ui/skeleton';

export default function SupplierCatalogLoading() {
  return (
    <section className="space-y-8">
      {/* Page Header */}
      <SkeletonPageHeader showAction={false} />

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex-1">
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
      </div>

      {/* Results count */}
      <Skeleton className="h-4 w-48" />

      {/* Catalog Table */}
      <SkeletonTable rows={10} columns={5} />
    </section>
  );
}

