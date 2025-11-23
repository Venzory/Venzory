import Link from 'next/link';
import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getInventoryService } from '@/src/services';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { hasRole } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { parseListParams } from '@/lib/url-params';

import { CatalogItemList } from './_components/catalog-item-list';
import { MyCatalogFilters } from './_components/my-catalog-filters';
import { calculateItemStockInfo } from '@/lib/inventory-utils';

interface MyCatalogPageProps {
  searchParams?: Promise<{
    q?: string;
    supplier?: string;
    lowStock?: string;
    highlight?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  }>;
}

export default async function MyCatalogPage({ searchParams }: MyCatalogPageProps) {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);
  const params = searchParams ? await searchParams : {};
  
  // Parse common list parameters using shared utility
  const { page: currentPage, limit: itemsPerPage, search, sortBy, sortOrder } = parseListParams(params);
  const { supplier, lowStock, highlight } = params;

  // Determine if we can sort server-side (only for simple fields)
  const canSortServerSide = !sortBy || sortBy === 'name' || sortBy === 'sku';
  const serverSortBy = canSortServerSide ? (sortBy as 'name' | 'sku' | undefined) : undefined;

  // Fetch items with filters (don't apply lowStockOnly server-side, we'll filter client-side)
  const inventoryService = getInventoryService();
  const { items, totalCount } = await inventoryService.findItems(ctx, {
    search,
    practiceSupplierId: supplier,
  }, {
    page: canSortServerSide ? currentPage : 1,
    limit: canSortServerSide ? itemsPerPage : 10000,
    sortBy: serverSortBy,
    sortOrder: canSortServerSide ? (sortOrder as 'asc' | 'desc') : undefined,
  });

  // Get practice suppliers for filter (using PracticeSupplier instead of legacy Supplier)
  const practiceSuppliers = await getPracticeSupplierRepository().findPracticeSuppliers(
    practiceId,
    { includeBlocked: false }
  );
  
  // Map to simple { id, name } shape for the filter component
  const suppliers = practiceSuppliers.map(ps => ({
    id: ps.id,
    name: ps.customLabel || ps.globalSupplier.name,
  }));

  // Calculate low stock info and total stock for each item using shared utility
  const itemsWithStockInfo = items.map(item => {
    const stockInfo = calculateItemStockInfo(item);

    return {
      ...item,
      ...stockInfo,
    };
  });

  // Apply client-side low stock filter if requested
  const filteredItems = lowStock === 'true' 
    ? itemsWithStockInfo.filter(item => item.isLowStock)
    : itemsWithStockInfo;

  // For computed fields (brand, supplier, stock, status), we still need client-side sorting
  let finalItems = filteredItems;
  let finalTotalCount = lowStock === 'true' ? filteredItems.length : totalCount;
  
  if (!canSortServerSide && sortBy) {
    const sortedItems = [...filteredItems].sort((a, b) => {
      const order = sortOrder === 'desc' ? -1 : 1;
      
      switch (sortBy) {
        case 'brand':
          return order * ((a.product?.brand || '').localeCompare(b.product?.brand || ''));
        case 'supplier':
          const supplierA = a.defaultPracticeSupplier?.customLabel || a.defaultPracticeSupplier?.globalSupplier?.name || '';
          const supplierB = b.defaultPracticeSupplier?.customLabel || b.defaultPracticeSupplier?.globalSupplier?.name || '';
          return order * supplierA.localeCompare(supplierB);
        case 'stock':
          return order * (a.totalStock - b.totalStock);
        case 'status':
          return order * ((a.isLowStock ? 1 : 0) - (b.isLowStock ? 1 : 0));
        default:
          return 0;
      }
    });

    // Client-side pagination for computed sorts
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    finalItems = sortedItems.slice(startIndex, endIndex);
    finalTotalCount = sortedItems.length;
  }

  // Calculate pagination UI values
  const totalPages = Math.ceil(finalTotalCount / itemsPerPage);

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  const hasActiveFilters = Boolean(search || supplier || lowStock);

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              My Items
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Manage your practice&apos;s product-first catalog — pick preferred suppliers per product and keep ordering fast.
            </p>
          </div>
          <Link href="/supplier-catalog">
            <Button variant="primary">Browse Supplier Catalog</Button>
          </Link>
        </div>

        <MyCatalogFilters 
          initialSearch={search}
          initialSupplier={supplier}
          initialLowStock={lowStock === 'true'}
          suppliers={suppliers}
        />

        <CatalogItemList
          items={finalItems as any}
          canManage={canManage}
          hasActiveFilters={hasActiveFilters}
          highlightItemId={highlight}
          currentSort={sortBy || 'name'}
          currentSortOrder={sortOrder || 'asc'}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={finalTotalCount}
          itemsPerPage={itemsPerPage}
        />
      </section>
    </div>
  );
}

