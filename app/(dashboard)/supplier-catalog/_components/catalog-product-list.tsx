'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package, CheckCircle2, ShoppingCart, ArrowUp, ArrowDown } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { formatCurrency } from '@/lib/utils';
import { AddToCatalogDialog } from './add-to-catalog-dialog';
import { DataTable } from '@/components/ui/data-table';

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

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams);
    
    if (currentSort === column) {
      params.set('sortOrder', direction);
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

  const columns = [
    {
      accessorKey: 'name',
      header: 'Product Name',
      enableSorting: true,
      cell: (product: ProductWithInfo) => (
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
      )
    },
    {
      accessorKey: 'brand',
      header: 'Brand',
      enableSorting: true,
      cell: (product: ProductWithInfo) => (
        <span className="text-slate-700 dark:text-slate-300">
          {product.brand || '-'}
        </span>
      )
    },
    {
      accessorKey: 'gtin',
      header: 'GTIN',
      cell: (product: ProductWithInfo) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {product.gtin || '-'}
        </span>
      )
    },
    {
      accessorKey: 'suppliers',
      header: 'Suppliers',
      enableSorting: true,
      className: 'text-center',
      cell: (product: ProductWithInfo) => (
        <span className="text-slate-700 dark:text-slate-300">
          {product.supplierCount}
        </span>
      )
    },
    {
      accessorKey: 'price',
      header: 'From Price',
      enableSorting: true,
      cell: (product: ProductWithInfo) => (
        product.lowestPrice !== null ? (
          <span className="font-medium text-brand">
            {formatCurrency(product.lowestPrice)}
          </span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">-</span>
        )
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (product: ProductWithInfo) => (
        product.inCatalog ? (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
            <CheckCircle2 className="h-3 w-3" />
            In My Items
          </div>
        ) : (
          <span className="inline-flex px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium">
            Not in My Items
          </span>
        )
      )
    },
    {
      accessorKey: 'actions',
      header: '',
      className: 'text-right',
      cell: (product: ProductWithInfo) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/supplier-catalog/product/${product.id}`}>
            <Button variant="ghost" size="sm" className="text-xs">
              View
            </Button>
          </Link>
          
          {product.inCatalog ? (
            <Link href={`/my-items?highlight=${product.itemId}`}>
              <Button variant="secondary" size="sm" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                View in My Items
              </Button>
            </Link>
          ) : (
            canManage && (
              <AddToCatalogDialog
                productId={product.id}
                productName={product.name}
                offers={product.offers}
                trigger={
                  <Button variant="primary" size="sm" className="text-xs">
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Add to My Items
                  </Button>
                }
              />
            )
          )}
        </div>
      )
    }
  ];

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
            <DataTable 
                columns={columns} 
                data={products} 
                className="border-0"
                onSort={handleSort}
                sortColumn={currentSort}
                sortOrder={currentSortOrder as 'asc' | 'desc'}
            />
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
