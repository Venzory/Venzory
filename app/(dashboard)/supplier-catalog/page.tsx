import Link from 'next/link';
import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getProductService, getInventoryService } from '@/src/services';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { hasRole } from '@/lib/rbac';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
  
  const { q, supplier, notInItems, sortBy, sortOrder, page } = params;
  
  // Pagination settings
  const itemsPerPage = 50;
  const currentPage = parseInt(page || '1', 10);

  // Get practice's linked suppliers
  const practiceSuppliers = await getPracticeSupplierRepository().findPracticeSuppliers(
    practiceId,
    { includeBlocked: false }
  );

  // Find products available from practice's suppliers
  const productService = getProductService();
  const products = await productService.findProductsForPractice(ctx, {
    search: q?.trim(),
    practiceSupplierId: supplier,
  });

  // Get all items for this practice to determine what's already in catalog
  const inventoryService = getInventoryService();
  const items = await inventoryService.findItems(ctx, {});
  const itemsByProductId = new Map(items.map(item => [item.productId, item]));

  // For each product, determine if it's in the catalog and get supplier offers
  let productsWithInfo = await Promise.all(
    products.map(async (product) => {
      const offers = await productService.getSupplierOffersForProduct(ctx, product.id);
      const existingItem = itemsByProductId.get(product.id);
      const lowestPrice = offers.length > 0
        ? Math.min(...offers.map(o => o.unitPrice ? Number(o.unitPrice) : Infinity))
        : null;
      
      return {
        ...product,
        inCatalog: !!existingItem,
        itemId: existingItem?.id,
        supplierCount: offers.length,
        lowestPrice: lowestPrice !== Infinity ? lowestPrice : null,
        offers,
      };
    })
  );

  // Filter by "Not in my items" if requested
  if (notInItems === 'true') {
    productsWithInfo = productsWithInfo.filter(p => !p.inCatalog);
  }

  // Sort products
  const sortedProducts = [...productsWithInfo].sort((a, b) => {
    const order = sortOrder === 'desc' ? -1 : 1;
    
    switch (sortBy) {
      case 'name':
        return order * a.name.localeCompare(b.name);
      case 'brand':
        return order * (a.brand || '').localeCompare(b.brand || '');
      case 'suppliers':
        return order * (a.supplierCount - b.supplierCount);
      case 'price':
        const priceA = a.lowestPrice ?? Infinity;
        const priceB = b.lowestPrice ?? Infinity;
        return order * (priceA - priceB);
      case 'status':
        return order * ((a.inCatalog ? 1 : 0) - (b.inCatalog ? 1 : 0));
      default:
        // Default sort by name
        return a.name.localeCompare(b.name);
    }
  });

  // Pagination
  const totalProducts = sortedProducts.length;
  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  const hasActiveFilters = Boolean(q || supplier || notInItems);

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Supplier Catalog
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Browse products from your linked suppliers and add new items to your catalog.
            </p>
          </div>
          <Link href="/my-items">
            <Button variant="secondary">View My Items</Button>
          </Link>
        </div>

        <CatalogFilters 
          initialSearch={q}
          initialSupplier={supplier}
          initialNotInItems={notInItems === 'true'}
          suppliers={practiceSuppliers}
        />

        <CatalogProductList
          products={paginatedProducts as any}
          canManage={canManage}
          hasActiveFilters={hasActiveFilters}
          currentSort={sortBy || 'name'}
          currentSortOrder={sortOrder || 'asc'}
          currentPage={currentPage}
          totalPages={totalPages}
          totalProducts={totalProducts}
        />
      </section>
    </div>
  );
}

