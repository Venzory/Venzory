'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Package, Factory } from 'lucide-react';

import { DataTable, type Column } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { SupplierItem } from '@/src/domain/models';
import { EditSupplierItemForm } from './edit-supplier-item-form';

type SupplierItemRow = SupplierItem & {
  product?: {
    id: string;
    name: string;
    brand?: string | null;
    gtin?: string | null;
  } | null;
  globalSupplier?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
};

interface SupplierItemListProps {
  items: SupplierItemRow[];
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  totalPages: number;
  hasActiveFilters?: boolean;
  currentSort?: string;
  currentSortOrder?: 'asc' | 'desc';
}

export function SupplierItemList({
  items,
  totalItems,
  itemsPerPage,
  currentPage,
  totalPages,
  hasActiveFilters = false,
  currentSort = 'supplier',
  currentSortOrder = 'asc',
}: SupplierItemListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams);
    params.set('sortBy', column);
    params.set('sortOrder', direction);
    params.delete('page');
    router.push(`/owner/supplier-catalog?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const safePage = Math.max(1, Math.min(page, totalPages));
    const params = new URLSearchParams(searchParams);
    params.set('page', safePage.toString());
    router.push(`/owner/supplier-catalog?${params.toString()}`);
  };

  const columns: Column<SupplierItemRow>[] = [
    {
      accessorKey: 'supplier',
      header: 'Supplier',
      enableSorting: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Factory className="h-4 w-4 text-slate-500" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-slate-900 dark:text-white">
              {row.globalSupplier?.name ?? 'Unknown supplier'}
            </span>
            {row.globalSupplier?.email && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {row.globalSupplier.email}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'product',
      header: 'Product',
      enableSorting: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
            <Package className="h-4 w-4 text-slate-500" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-slate-900 dark:text-white">
              {row.product?.name ?? 'Unnamed product'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {row.product?.brand && <>{row.product.brand} · </>}
              {row.product?.gtin ?? 'No GTIN'}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'supplierSku',
      header: 'Supplier SKU',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
          {row.supplierSku || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'unitPrice',
      header: 'Price',
      enableSorting: true,
      cell: (row) =>
        row.unitPrice !== null && row.unitPrice !== undefined ? (
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatCurrency(Number(row.unitPrice), row.currency || 'EUR')}
          </span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">—</span>
        ),
    },
    {
      accessorKey: 'minOrderQty',
      header: 'Min Qty',
      cell: (row) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {row.minOrderQty ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row) => (
        <Badge variant={row.isActive ? 'success' : 'neutral'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      enableSorting: true,
      cell: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {new Date(row.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const from = (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {totalItems === 0 ? 0 : from}–{to} of {totalItems} supplier entries
        </span>
        {hasActiveFilters && (
          <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Filters applied
          </span>
        )}
      </div>

      <DataTable
        columns={columns}
        data={items}
        className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40"
        onSort={handleSort}
        sortColumn={currentSort}
        sortOrder={currentSortOrder}
        expandable
        renderSubComponent={(row) => (
          <div className="border-t border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <EditSupplierItemForm supplierItem={row} />
          </div>
        )}
        emptyState={
          <EmptyState
            icon={Factory}
            title={hasActiveFilters ? 'No supplier entries found' : 'No supplier data yet'}
            description={
              hasActiveFilters
                ? 'Try adjusting your search, supplier filter, or status.'
                : 'Supplier catalog entries will appear here after data imports.'
            }
          />
        }
      />

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  );
}

