'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Package, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { toast } from '@/lib/toast';
import { createOrdersFromCatalogAction } from '../actions';
import { DeleteItemButton } from './delete-item-button';
import { DataTable } from '@/components/ui/data-table';
import { ItemSupplierPanel } from './item-supplier-panel';

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
  itemsPerPage: number;
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
  itemsPerPage,
}: CatalogItemListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [highlightedId, setHighlightedId] = useState(highlightItemId);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset selection when items change (e.g. pagination/filter)
  useEffect(() => {
    setSelectedItemIds(new Set());
  }, [items]);

  // Remove highlight after 3 seconds
  useEffect(() => {
    if (highlightedId) {
      const timer = setTimeout(() => setHighlightedId(undefined), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedId]);

  const handleCreateOrders = async () => {
    if (selectedItemIds.size === 0) return;

    setIsSubmitting(true);
    try {
      const result = await createOrdersFromCatalogAction(Array.from(selectedItemIds));
      
      if (result.success) {
        toast.success(result.message);
        setSelectedItemIds(new Set());
        router.push('/orders');
      } else {
        toast.error(result.error || 'Failed to create orders');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams);
    
    if (currentSort === column) {
       // direction is toggled by DataTable if we pass sortOrder correctly
       // or we can just rely on toggle logic here if we want
       params.set('sortOrder', direction);
    } else {
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

  const columns = [
    {
        accessorKey: 'name',
        header: 'Item Name',
        enableSorting: true,
        cell: (item: ItemWithStockInfo) => (
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
        )
    },
    {
        accessorKey: 'sku',
        header: 'SKU',
        enableSorting: true,
        cell: (item: ItemWithStockInfo) => (
            <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                {item.sku || '-'}
            </span>
        )
    },
    {
        accessorKey: 'brand',
        header: 'Brand',
        enableSorting: true,
        cell: (item: ItemWithStockInfo) => (
            <span className="text-slate-700 dark:text-slate-300">
                {item.product?.brand || '-'}
            </span>
        )
    },
    {
        accessorKey: 'supplier',
        header: 'Default Supplier',
        enableSorting: true,
        cell: (item: ItemWithStockInfo) => (
            <div className="flex flex-col gap-2">
                {item.defaultPracticeSupplier ? (
                    <span className="text-slate-700 dark:text-slate-300">
                        {item.defaultPracticeSupplier.customLabel || item.defaultPracticeSupplier.globalSupplier.name}
                    </span>
                ) : (
                    <span className="text-slate-500 dark:text-slate-400 italic">No preferred supplier</span>
                )}
                {canManage && (
                    <ItemSupplierPanel
                        itemId={item.id}
                        itemName={item.name}
                        trigger={
                            <Button variant="ghost" size="sm" className="w-fit text-xs">
                                Manage Suppliers
                            </Button>
                        }
                    />
                )}
            </div>
        )
    },
    {
        accessorKey: 'stock',
        header: 'Total Stock',
        enableSorting: true,
        cell: (item: ItemWithStockInfo) => (
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
        )
    },
    {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: true,
        cell: (item: ItemWithStockInfo) => (
            item.isLowStock ? (
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    Low Stock
                </div>
            ) : (
                <span className="inline-flex px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                    Good
                </span>
            )
        )
    },
    {
        accessorKey: 'actions',
        header: 'Actions',
        className: 'text-right',
        cell: (item: ItemWithStockInfo) => (
            <div className="flex items-center justify-end gap-2">
                <Link href={`/inventory?q=${encodeURIComponent(item.name)}`}>
                    <Button variant="ghost" size="sm" className="text-xs">
                        Inventory
                    </Button>
                </Link>
                
                {canManage && (
                    <>
                        <Link href={`/orders/new?item=${item.id}`}>
                            <Button variant="secondary" size="sm" className="text-xs">
                                Order
                            </Button>
                        </Link>
                        <DeleteItemButton itemId={item.id} itemName={item.name} />
                    </>
                )}
            </div>
        )
    }
  ];
  
  const getRowClassName = (item: ItemWithStockInfo) => {
    if (item.id === highlightedId) return 'bg-brand/10 dark:bg-brand/20';
    return '';
  }

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
      {/* Results count and actions */}
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <div>
          <span>
            {totalItems} {totalItems === 1 ? 'item' : 'items'} in your catalog
          </span>
          {totalItems > itemsPerPage && (
            <span className="ml-2">
              (Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)})
            </span>
          )}
        </div>
        
        {canManage && selectedItemIds.size > 0 && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateOrders}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            Create Draft Orders ({selectedItemIds.size})
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="overflow-x-auto">
            <DataTable 
                columns={columns}
                data={items}
                className="border-0"
                selectable={canManage}
                selectedRows={selectedItemIds}
                onSelectionChange={setSelectedItemIds}
                onSort={handleSort}
                sortColumn={currentSort}
                sortOrder={currentSortOrder as 'asc' | 'desc'}
                getRowClassName={getRowClassName}
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
