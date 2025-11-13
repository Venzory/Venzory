'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Package, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';

interface ItemWithStockInfo {
  id: string;
  name: string;
  sku: string | null;
  product?: {
    brand: string | null;
  } | null;
  defaultPracticeSupplier?: {
    id: string;
    customLabel: string | null;
    globalSupplier: {
      name: string;
    };
  } | null;
  totalStock: number;
  isLowStock: boolean;
  lowStockLocations: string[];
}

interface CatalogItemListProps {
  items: ItemWithStockInfo[];
  canManage: boolean;
  hasActiveFilters: boolean;
  highlightItemId?: string;
  currentSort: string;
  currentSortOrder: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export function CatalogItemList({
  items,
  canManage,
  hasActiveFilters,
  highlightItemId,
  currentSort,
  currentSortOrder,
  currentPage,
  totalPages,
  totalItems,
}: CatalogItemListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [highlightedId, setHighlightedId] = useState(highlightItemId);

  // Remove highlight after 3 seconds
  useEffect(() => {
    if (highlightedId) {
      const timer = setTimeout(() => setHighlightedId(undefined), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedId]);

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
    
    router.push(`/my-items?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`/my-items?${params.toString()}`);
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

  if (items.length === 0) {
    if (hasActiveFilters) {
      return (
        <Card className="p-8">
          <EmptyState
            icon={Package}
            title="No items found"
            description="Try adjusting your search or filters"
          />
        </Card>
      );
    }

    return (
      <Card className="p-8">
        <EmptyState
          icon={Package}
          title="Your catalog is empty"
          description="Browse products from your suppliers and add them to your catalog to get started."
          action={
            <Link href="/supplier-catalog">
              <Button variant="primary">Browse Supplier Catalog</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span>
          {totalItems} {totalItems === 1 ? 'item' : 'items'} in your catalog
        </span>
        {totalItems > 50 && (
          <span>
            Showing {((currentPage - 1) * 50) + 1}-{Math.min(currentPage * 50, totalItems)}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
              <tr>
                <SortableHeader column="name" label="Item Name" />
                <SortableHeader column="sku" label="SKU" />
                <SortableHeader column="brand" label="Brand" />
                <SortableHeader column="supplier" label="Default Supplier" />
                <SortableHeader column="stock" label="Total Stock" />
                <SortableHeader column="status" label="Status" />
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {items.map((item) => {
                const isHighlighted = item.id === highlightedId;

                return (
                  <tr
                    key={item.id}
                    className={`transition ${
                      isHighlighted 
                        ? 'bg-brand/10 dark:bg-brand/20' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Item Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center">
                          <Package className="h-4 w-4 text-slate-400" />
                        </div>
                        <Link 
                          href={`/inventory?q=${encodeURIComponent(item.name)}`}
                          className="font-medium text-slate-900 dark:text-slate-200 hover:text-brand transition"
                        >
                          {item.name}
                        </Link>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                        {item.sku || '-'}
                      </span>
                    </td>

                    {/* Brand */}
                    <td className="px-4 py-3">
                      <span className="text-slate-700 dark:text-slate-300">
                        {item.product?.brand || '-'}
                      </span>
                    </td>

                    {/* Default Supplier */}
                    <td className="px-4 py-3">
                      {item.defaultPracticeSupplier ? (
                        <span className="text-slate-700 dark:text-slate-300">
                          {item.defaultPracticeSupplier.customLabel || item.defaultPracticeSupplier.globalSupplier.name}
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400 italic">No default</span>
                      )}
                    </td>

                    {/* Total Stock */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-semibold ${
                          item.isLowStock 
                            ? 'text-orange-600 dark:text-orange-400' 
                            : 'text-slate-900 dark:text-white'
                        }`}>
                          {item.totalStock}
                        </span>
                        {item.isLowStock && (
                          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {item.isLowStock ? (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs font-medium">
                          <AlertTriangle className="h-3 w-3" />
                          Low Stock
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                          Good
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/inventory?q=${encodeURIComponent(item.name)}`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            Inventory
                          </Button>
                        </Link>
                        
                        {canManage && (
                          <Link href={`/orders/new?item=${item.id}`}>
                            <Button variant="secondary" size="sm" className="text-xs">
                              Order
                            </Button>
                          </Link>
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
