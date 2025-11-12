'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package, CheckCircle2, ShoppingCart, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/lib/utils';

interface ProductWithInfo {
  id: string;
  name: string;
  brand: string | null;
  gtin: string | null;
  description: string | null;
  inCatalog: boolean;
  itemId?: string;
  supplierCount: number;
  lowestPrice: number | null;
  offers: any[];
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
}: CatalogProductListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (currentSort === column) {
      // Toggle sort order
      params.set('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
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

  const SortableHeader = ({ column, label }: { column: string; label: string }) => {
    const isActive = currentSort === column;
    const isAsc = currentSortOrder === 'asc';

    return (
      <th 
        className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center gap-1">
          <span>{label}</span>
          {isActive && (
            <>
              {isAsc ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
            </>
          )}
          {!isActive && <span className="h-3 w-3" />}
        </div>
      </th>
    );
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
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
              <tr>
                <SortableHeader column="name" label="Product Name" />
                <SortableHeader column="brand" label="Brand" />
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  GTIN
                </th>
                <SortableHeader column="suppliers" label="Suppliers" />
                <SortableHeader column="price" label="From Price" />
                <SortableHeader column="status" label="Status" />
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  {/* Product Name */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <Link 
                        href={`/supplier-catalog/product/${product.id}`}
                        className="font-medium text-slate-900 dark:text-slate-200 hover:text-brand transition"
                      >
                        {product.name}
                      </Link>
                      {product.description && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {product.description}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Brand */}
                  <td className="px-4 py-3">
                    <span className="text-slate-700 dark:text-slate-300">
                      {product.brand || '-'}
                    </span>
                  </td>

                  {/* GTIN */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                      {product.gtin || '-'}
                    </span>
                  </td>

                  {/* Suppliers Count */}
                  <td className="px-4 py-3 text-center">
                    <span className="text-slate-700 dark:text-slate-300">
                      {product.supplierCount}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3">
                    {product.lowestPrice !== null ? (
                      <span className="font-medium text-brand">
                        {formatCurrency(product.lowestPrice)}
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">-</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {product.inCatalog ? (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        In Catalog
                      </div>
                    ) : (
                      <span className="inline-flex px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium">
                        Available
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/supplier-catalog/product/${product.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          View
                        </Button>
                      </Link>
                      
                      {product.inCatalog ? (
                        <Link href={`/my-items?item=${product.itemId}`}>
                          <Button variant="secondary" size="sm" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            In Items
                          </Button>
                        </Link>
                      ) : (
                        canManage && (
                          <Link href={`/supplier-catalog/product/${product.id}?action=add`}>
                            <Button variant="primary" size="sm" className="text-xs">
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </Link>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Page {currentPage} of {totalPages}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="min-w-[2rem]"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
