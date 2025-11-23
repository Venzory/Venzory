import Link from 'next/link';
import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getProductService, getInventoryService } from '@/src/services';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { hasRole } from '@/lib/rbac';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { parseListParams } from '@/lib/url-params';

import { CatalogProductList } from './_components/catalog-product-list';
import { CatalogFilters } from './_components/catalog-filters';

interface CatalogPageProps {
  searchParams?: Promise<{
    q?: string;
    supplier?: string;
    notInItems?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);
  const params = searchParams ? await searchParams : {};
  
  // Parse common list parameters using shared utility
  const { page: currentPage, limit: itemsPerPage, search, sortBy, sortOrder } = parseListParams(params);
  const { supplier, notInItems } = params;

  // Get practice's linked suppliers
  const practiceSuppliers = await getPracticeSupplierRepository().findPracticeSuppliers(
    practiceId,
    { includeBlocked: false }
  );

  // Determine if we can sort server-side (only for simple fields)
  const canSortServerSide = !sortBy || sortBy === 'name' || sortBy === 'brand';
  const serverSortBy = canSortServerSide ? (sortBy as 'name' | 'brand' | undefined) : undefined;

  // Find products available from practice's suppliers with pagination
  const productService = getProductService();
  const { products, totalCount } = await productService.findProductsForPractice(ctx, {
    search,
  }, {
    page: canSortServerSide ? currentPage : 1,
    limit: canSortServerSide ? itemsPerPage : 10000, // Fetch all if client-side sorting needed
    sortBy: serverSortBy,
    sortOrder: canSortServerSide ? (sortOrder as 'asc' | 'desc') : undefined,
  });

  // Get all items for this practice to determine what's already in catalog
  const inventoryService = getInventoryService();
  const { items } = await inventoryService.findItems(ctx, {}, { limit: 10000 });
  const itemsByProductId = new Map(items.map(item => [item.productId, item]));

  // Batch fetch all supplier offers for products (avoids N+1 query)
  const productIds = products.map(p => p.id);
  const offersByProductId = await productService.getSupplierOffersForProducts(ctx, productIds);

  // For each product, determine if it's in the catalog and attach supplier offers
  let productsWithInfo = products.map((product) => {
    const offers = offersByProductId.get(product.id) || [];
    const existingItem = itemsByProductId.get(product.id);
    const lowestPrice = offers.length > 0
      ? Math.min(...offers.map(o => o.unitPrice !== null && o.unitPrice !== undefined ? Number(o.unitPrice) : Infinity))
      : null;
    
    return {
      ...product,
      inCatalog: !!existingItem,
      itemId: existingItem?.id,
      supplierCount: offers.length,
      lowestPrice: lowestPrice !== Infinity ? lowestPrice : null,
      offers,
    };
  });

  // Filter by "Not in my items" if requested
  if (notInItems === 'true') {
    productsWithInfo = productsWithInfo.filter(p => !p.inCatalog);
  }

  // For computed fields (suppliers, price, status), we still need client-side sorting
  let finalProducts = productsWithInfo;
  let finalTotalCount = notInItems === 'true' ? productsWithInfo.length : totalCount;
  
  if (!canSortServerSide && sortBy) {
    const sortedProducts = [...productsWithInfo].sort((a, b) => {
      const order = sortOrder === 'desc' ? -1 : 1;
      
      switch (sortBy) {
        case 'suppliers':
          return order * (a.supplierCount - b.supplierCount);
        case 'price':
          const priceA = a.lowestPrice ?? Infinity;
          const priceB = b.lowestPrice ?? Infinity;
          return order * (priceA - priceB);
        case 'status':
          return order * ((a.inCatalog ? 1 : 0) - (b.inCatalog ? 1 : 0));
        default:
          return 0;
      }
    });

    // Client-side pagination for computed sorts
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    finalProducts = sortedProducts.slice(startIndex, endIndex);
    finalTotalCount = sortedProducts.length;
  }

  // Calculate pagination UI values
  const totalPages = Math.ceil(finalTotalCount / itemsPerPage);

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  const hasActiveFilters = Boolean(search || supplier || notInItems);

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Supplier Catalog
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Browse products from your linked suppliers and add them to My Items.
            </p>
          </div>
          <Link href="/my-items">
            <Button variant="secondary">View My Items</Button>
          </Link>
        </div>

        <CatalogFilters 
          initialSearch={search}
          initialSupplier={supplier}
          initialNotInItems={notInItems === 'true'}
          suppliers={practiceSuppliers}
        />

        <CatalogProductList
          products={finalProducts as any}
          canManage={canManage}
          hasActiveFilters={hasActiveFilters}
          currentSort={sortBy || 'name'}
          currentSortOrder={sortOrder || 'asc'}
          currentPage={currentPage}
          totalPages={totalPages}
          totalProducts={finalTotalCount}
        />
      </section>
    </div>
  );
}

