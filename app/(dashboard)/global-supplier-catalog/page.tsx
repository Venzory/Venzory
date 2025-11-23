import { requireActivePractice } from '@/lib/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { parseListParams } from '@/lib/url-params';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { getProductService } from '@/src/services';
import { Card } from '@/components/ui/card';
import { SupplierCatalogFilters } from './_components/supplier-catalog-filters';
import { SupplierItemList } from './_components/supplier-item-list';
import { decimalToNumber } from '@/lib/prisma-transforms';

interface GlobalSupplierCatalogPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GlobalSupplierCatalogPage({ searchParams }: GlobalSupplierCatalogPageProps) {
  const { session } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);
  const params = searchParams ? await searchParams : {};
  const { page: currentPage, limit, search, sortBy, sortOrder } = parseListParams(params);

  if (!isPlatformOwner(session.user.email)) {
    return (
      <Card className="p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Only the platform owner can manage the global supplier catalog.
          </p>
        </div>
      </Card>
    );
  }

  const supplierParam = Array.isArray(params.supplier) ? params.supplier[0] : params.supplier;
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status;
  const normalizedStatus =
    statusParam === 'active' ? 'active' : statusParam === 'inactive' ? 'inactive' : 'all';

  const filters = {
    search,
    globalSupplierId: supplierParam && supplierParam !== 'all' ? supplierParam : undefined,
    isActive:
      normalizedStatus === 'active'
        ? true
        : normalizedStatus === 'inactive'
          ? false
          : undefined,
  };

  const allowedSortFields = new Set(['supplier', 'product', 'unitPrice', 'updatedAt']);
  const normalizedSortBy =
    sortBy && allowedSortFields.has(sortBy) ? (sortBy as 'supplier' | 'product' | 'unitPrice' | 'updatedAt') : undefined;

  const [catalogResult, globalSuppliers] = await Promise.all([
    getProductService().findSupplierItemsForOwner(ctx, filters, {
      page: currentPage,
      limit,
      sortBy: normalizedSortBy,
      sortOrder,
    }),
    getPracticeSupplierRepository().findGlobalSuppliers({
      pagination: { limit: 500 },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(catalogResult.totalCount / limit));
  const supplierOptions = globalSuppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
  }));

  // Convert Decimal objects to numbers for client components
  const serializedItems = catalogResult.items.map((item: any) => ({
    ...item,
    unitPrice: item.unitPrice ? decimalToNumber(item.unitPrice) : null,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Global Supplier Catalog
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Manage product catalog entries from global suppliers (Platform Owner).
        </p>
      </div>

      <SupplierCatalogFilters
        suppliers={supplierOptions}
        initialSearch={search}
        initialSupplier={supplierParam || 'all'}
        initialStatus={normalizedStatus}
      />

      <SupplierItemList
        items={serializedItems as any}
        totalItems={catalogResult.totalCount}
        itemsPerPage={limit}
        currentPage={currentPage}
        totalPages={totalPages}
        hasActiveFilters={Boolean(search || supplierParam || statusParam)}
        currentSort={sortBy}
        currentSortOrder={sortOrder}
      />
    </div>
  );
}

