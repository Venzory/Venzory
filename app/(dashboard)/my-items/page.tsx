import Link from 'next/link';
import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getInventoryService } from '@/src/services';
import { hasRole } from '@/lib/rbac';
import { Button } from '@/components/ui/button';

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
  
  const { q, supplier, lowStock, highlight, sortBy, sortOrder, page } = params;

  // Pagination settings
  const itemsPerPage = 50;
  const currentPage = parseInt(page || '1', 10);

  // Fetch items with filters
  const inventoryService = getInventoryService();
  const items = await inventoryService.findItems(ctx, {
    search: q?.trim(),
    practiceSupplierId: supplier,
    lowStockOnly: lowStock === 'true',
  });

  // Get suppliers for filter
  const suppliers = await inventoryService.getSuppliers(ctx);

  // Calculate low stock info and total stock for each item using shared utility
  const itemsWithStockInfo = items.map(item => {
    const stockInfo = calculateItemStockInfo(item);

    return {
      ...item,
      ...stockInfo,
    };
  });

  // Sort items
  const sortedItems = [...itemsWithStockInfo].sort((a, b) => {
    const order = sortOrder === 'desc' ? -1 : 1;
    
    switch (sortBy) {
      case 'name':
        return order * a.name.localeCompare(b.name);
      case 'sku':
        return order * (a.sku || '').localeCompare(b.sku || '');
      case 'brand':
        return order * (a.product?.brand || '').localeCompare(b.product?.brand || '');
      case 'supplier':
        const supplierA = a.defaultPracticeSupplier?.customLabel || a.defaultPracticeSupplier?.globalSupplier?.name || '';
        const supplierB = b.defaultPracticeSupplier?.customLabel || b.defaultPracticeSupplier?.globalSupplier?.name || '';
        return order * supplierA.localeCompare(supplierB);
      case 'stock':
        return order * (a.totalStock - b.totalStock);
      case 'status':
        return order * ((a.isLowStock ? 1 : 0) - (b.isLowStock ? 1 : 0));
      default:
        // Default sort by name
        return a.name.localeCompare(b.name);
    }
  });

  // Pagination
  const totalItems = sortedItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = sortedItems.slice(startIndex, endIndex);

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  const hasActiveFilters = Boolean(q || supplier || lowStock);

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              My Items
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Manage your practice&apos;s product catalog - items you stock and can order.
            </p>
          </div>
          <Link href="/supplier-catalog">
            <Button variant="primary">Browse Supplier Catalog</Button>
          </Link>
        </div>

        <MyCatalogFilters 
          initialSearch={q}
          initialSupplier={supplier}
          initialLowStock={lowStock === 'true'}
          suppliers={suppliers}
        />

        <CatalogItemList
          items={paginatedItems as any}
          canManage={canManage}
          hasActiveFilters={hasActiveFilters}
          highlightItemId={highlight}
          currentSort={sortBy || 'name'}
          currentSortOrder={sortOrder || 'asc'}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
        />
      </section>
    </div>
  );
}

