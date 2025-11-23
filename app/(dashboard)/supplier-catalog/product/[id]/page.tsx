import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Package, Building2 } from 'lucide-react';
import { PracticeRole } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getProductService, getInventoryService } from '@/src/services';
import { hasRole } from '@/lib/rbac';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

import { AddToCatalogDialog } from '../../_components/add-to-catalog-dialog';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ action?: string }>;
}

export default async function ProductDetailPage({ params, searchParams }: ProductDetailPageProps) {
  const { id } = await params;
  const search = searchParams ? await searchParams : {};
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

  // Get product
  const productService = getProductService();
  const product = await productService.getProductById(ctx, id);

  // Get supplier offers for this product
  const offers = await productService.getSupplierOffersForProduct(ctx, id);

  if (offers.length === 0) {
    // Product not available from any of practice's suppliers
    redirect('/supplier-catalog');
  }

  // Check if already in catalog
  const inventoryService = getInventoryService();
  const { items } = await inventoryService.findItems(ctx, { productId: id }, { limit: 1 });
  const existingItem = items[0] || null;

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  const showAddDialog = search.action === 'add' && !existingItem && canManage;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/supplier-catalog">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Supplier Catalog
          </Button>
        </Link>
      </div>

      {/* Product Info */}
      <Card className="p-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0 w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
            <Package className="h-12 w-12 text-slate-400" />
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {product.name}
              </h1>
              {product.brand && (
                <p className="text-lg text-slate-600 dark:text-slate-400 mt-1">
                  {product.brand}
                </p>
              )}
              {product.gtin && (
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                  GTIN: {product.gtin}
                </p>
              )}
            </div>

            {product.description && (
              <p className="text-slate-700 dark:text-slate-300">
                {product.description}
              </p>
            )}

            {existingItem && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-sm">
                <Package className="h-4 w-4" />
                In My Items
              </div>
            )}
          </div>

          {!existingItem && canManage && (
            <div>
              <AddToCatalogDialog
                productId={product.id}
                productName={product.name}
                offers={offers as any}
                trigger={
                  <Button variant="primary">
                    Add to My Items
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </Card>

      {/* Supplier Offers */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Supplier Offers ({offers.length})
        </h2>
        
        <div className="grid gap-4">
          {offers.map((offer: any) => (
            <Card key={offer.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0 w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-slate-400" />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-white">
                        {offer.practiceSupplier?.customLabel || offer.practiceSupplier?.globalSupplier?.name}
                      </h3>
                      {offer.supplierSku && (
                        <p className="text-sm text-slate-500 dark:text-slate-500">
                          SKU: {offer.supplierSku}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      {offer.minOrderQty && (
                        <span>Min. Order: {offer.minOrderQty}</span>
                      )}
                      {offer.integrationType && offer.integrationType !== 'MANUAL' && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                          {offer.integrationType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {offer.unitPrice !== null && (
                    <div className="text-2xl font-bold text-brand">
                      {formatCurrency(Number(offer.unitPrice), offer.currency || 'EUR')}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {showAddDialog && (
        <AddToCatalogDialog
          productId={product.id}
          productName={product.name}
          offers={offers as any}
          defaultOpen={true}
        />
      )}
    </div>
  );
}

