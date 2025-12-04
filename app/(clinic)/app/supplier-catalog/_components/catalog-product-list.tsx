'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package, CheckCircle2, ShoppingCart, Building2, Crown, ChevronRight } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { AddToCatalogDialog } from './add-to-catalog-dialog';

interface SupplierOffer {
  id: string;
  globalSupplierId?: string;
  supplierName?: string | null;
  supplierSku?: string | null;
  unitPrice: number | null;
  currency: string | null;
  minOrderQty?: number | null;
  isPreferred?: boolean;
  globalSupplier?: {
    id: string;
    name: string;
  };
  practiceSupplier?: {
    id: string;
    customLabel: string | null;
    isPreferred: boolean;
    globalSupplier: {
      id: string;
      name: string;
    };
  };
}

interface ProductWithInfo {
  id: string;
  name: string;
  brand: string | null;
  gtin: string | null;
  description: string | null;
  shortDescription?: string | null;
  inCatalog: boolean;
  itemId?: string;
  supplierCount: number;
  lowestPrice: number | null;
  preferredSupplierName?: string | null;
  preferredSupplierPrice?: number | null;
  primaryImageUrl?: string | null;
  offers: SupplierOffer[];
}

interface CatalogProductListProps {
  products: ProductWithInfo[];
  canManage: boolean;
  hasActiveFilters: boolean;
  currentSort: string;
  currentSortOrder: string;
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  onProductSelect?: (productId: string) => void;
}

export function CatalogProductList({
  products,
  canManage,
  hasActiveFilters,
  currentSort,
  currentSortOrder,
  currentPage,
  totalPages,
  totalProducts,
  onProductSelect,
}: CatalogProductListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (currentSort === column) {
      params.set('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sortBy', column);
      params.set('sortOrder', 'asc');
    }
    
    // Reset to page 1 when sorting changes
    params.delete('page');
    
    router.push(`/supplier-catalog?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`/supplier-catalog?${params.toString()}`);
  };

  const handleRowClick = (product: ProductWithInfo, e: React.MouseEvent) => {
    // Don't trigger row click if clicking on a link or button
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button') || target.closest('[role="button"]')) {
      return;
    }
    
    if (onProductSelect) {
      onProductSelect(product.id);
    }
  };

  if (products.length === 0) {
    if (hasActiveFilters) {
      return (
        <Card className="p-8">
          <EmptyState
            icon={Package}
            title="No products found"
            description="Try adjusting your search or filters"
          />
        </Card>
      );
    }

    return (
      <Card className="p-8">
        <EmptyState
          icon={Package}
          title="No products available"
          description="There are no products available from your linked suppliers yet. If you haven't added any suppliers, start by linking one to browse their catalog."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span>
          Showing {((currentPage - 1) * 50) + 1}-{Math.min(currentPage * 50, totalProducts)} of {totalProducts} products
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                {/* Thumbnail */}
                <th className="h-12 px-4 w-[60px]" />
                
                {/* Product Name */}
                <th 
                  className="h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Product
                    {currentSort === 'name' && (
                      <span className="text-brand">{currentSortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>

                {/* Preferred Supplier */}
                <th className="h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Preferred Supplier
                </th>

                {/* From Price */}
                <th 
                  className="h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-1">
                    From Price
                    {currentSort === 'price' && (
                      <span className="text-brand">{currentSortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>

                {/* Status */}
                <th className="h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Status
                </th>

                {/* Actions */}
                <th className="h-12 px-4 text-right align-middle text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 w-[100px]">
                  
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {products.map((product) => {
                // Find preferred offer or use first offer
                const preferredOffer = product.offers.find(o => 
                  o.practiceSupplier?.isPreferred || o.isPreferred
                );
                const displayOffer = preferredOffer || product.offers[0];
                const displaySupplierName = displayOffer?.practiceSupplier?.customLabel 
                  || displayOffer?.practiceSupplier?.globalSupplier?.name 
                  || displayOffer?.supplierName;

                return (
                  <tr 
                    key={product.id}
                    onClick={(e) => handleRowClick(product, e)}
                    className={`
                      border-b border-slate-200 dark:border-slate-800 
                      transition-colors 
                      ${onProductSelect ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}
                    `}
                  >
                    {/* Thumbnail */}
                    <td className="p-4 align-middle">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product.primaryImageUrl ? (
                          <img 
                            src={product.primaryImageUrl} 
                            alt="" 
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Package className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                        )}
                      </div>
                    </td>

                    {/* Product Name & Description */}
                    <td className="p-4 align-middle">
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-slate-900 dark:text-slate-200 truncate">
                          {product.name}
                        </span>
                        {product.brand && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {product.brand}
                          </span>
                        )}
                        {(product.shortDescription || product.description) && (
                          <span className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                            {product.shortDescription || product.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Preferred Supplier */}
                    <td className="p-4 align-middle">
                      {displaySupplierName ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-slate-700 dark:text-slate-300 text-sm">
                              {displaySupplierName}
                            </span>
                          </div>
                          {preferredOffer && (
                            <span title="Preferred supplier">
                              <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />
                            </span>
                          )}
                          {product.supplierCount > 1 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              +{product.supplierCount - 1}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-sm">-</span>
                      )}
                    </td>

                    {/* From Price */}
                    <td className="p-4 align-middle">
                      {product.lowestPrice !== null ? (
                        <span className="font-medium text-brand">
                          {formatCurrency(product.lowestPrice)}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-4 align-middle">
                      {product.inCatalog ? (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          In My Items
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium">
                          Available
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!product.inCatalog && canManage && (
                          <AddToCatalogDialog
                            productId={product.id}
                            productName={product.name}
                            offers={product.offers as any}
                            trigger={
                              <Button variant="ghost" size="sm" className="text-xs h-8 px-2">
                                <ShoppingCart className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                        )}
                        {onProductSelect && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs h-8 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              onProductSelect(product.id);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
