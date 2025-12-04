import { Suspense } from 'react';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getReceivingService } from '@/src/services/receiving';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { MismatchesClient } from './_components/mismatches-client';
import type { MismatchStatus, MismatchType } from '@prisma/client';

interface SearchParams {
  status?: string;
  type?: string;
  supplier?: string;
  from?: string;
  to?: string;
}

export default async function MismatchesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const ctx = await buildRequestContext();
  const receivingService = getReceivingService();
  const practiceSupplierRepo = getPracticeSupplierRepository();

  // Build filters from search params
  const filters: any = {};

  if (params.status && ['OPEN', 'RESOLVED', 'NEEDS_SUPPLIER_CORRECTION'].includes(params.status)) {
    filters.status = params.status as MismatchStatus;
  }

  if (params.type && ['SHORT', 'OVER', 'DAMAGE', 'SUBSTITUTION'].includes(params.type)) {
    filters.type = params.type as MismatchType;
  }

  if (params.supplier) {
    filters.practiceSupplierId = params.supplier;
  }

  if (params.from) {
    filters.dateFrom = new Date(params.from);
  }

  if (params.to) {
    filters.dateTo = new Date(params.to);
  }

  // Fetch mismatches and suppliers in parallel
  const [mismatches, suppliers, counts] = await Promise.all([
    receivingService.getMismatchesForPractice(ctx, filters),
    practiceSupplierRepo.findPracticeSuppliers(ctx.practiceId),
    receivingService.getMismatchCounts(ctx),
  ]);

  // Transform suppliers for the filter dropdown
  const supplierOptions = suppliers.map((s) => ({
    id: s.id,
    name: s.customLabel || s.globalSupplier?.name || 'Unknown Supplier',
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Receiving Mismatches
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Track and resolve discrepancies from goods receiving
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Open</p>
          <p className="mt-1 text-3xl font-bold text-amber-900 dark:text-amber-100">
            {counts.open}
          </p>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
            Needs Supplier Correction
          </p>
          <p className="mt-1 text-3xl font-bold text-orange-900 dark:text-orange-100">
            {counts.needsSupplierCorrection}
          </p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">Resolved</p>
          <p className="mt-1 text-3xl font-bold text-green-900 dark:text-green-100">
            {counts.resolved}
          </p>
        </div>
      </div>

      {/* Client Component for Filters and Table */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
          </div>
        }
      >
        <MismatchesClient
          initialMismatches={mismatches}
          suppliers={supplierOptions}
          initialFilters={{
            status: params.status as any,
            type: params.type as any,
            practiceSupplierId: params.supplier,
            dateFrom: params.from,
            dateTo: params.to,
          }}
        />
      </Suspense>
    </div>
  );
}

