'use client';

import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { Gs1StatusBadge } from './gs1-status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable } from '@/components/ui/data-table';

interface ProductListProps {
  products: any[];
  canManage: boolean;
  hasActiveFilters: boolean;
}

export function ProductList({
  products,
  canManage,
  hasActiveFilters,
}: ProductListProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={hasActiveFilters ? 'No products match your filters' : 'No products yet'}
        description={
          hasActiveFilters
            ? 'Try adjusting your search or filter criteria.'
            : 'Products will appear here when created.'
        }
      />
    );
  }

  const columns = [
    {
      accessorKey: 'name',
      header: 'Product',
      cell: (product: any) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 dark:text-slate-200">
            {product.name}
          </span>
          {product.brand ? (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {product.brand}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'gtin',
      header: 'GTIN',
      cell: (product: any) => (
        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
          {product.gtin || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'gs1VerificationStatus',
      header: 'GS1 Status',
      cell: (product: any) => <Gs1StatusBadge status={product.gs1VerificationStatus} />,
    },
    {
      accessorKey: 'suppliers',
      header: 'Suppliers',
      className: 'text-center',
      cell: (product: any) => (
        <span className="text-slate-700 dark:text-slate-300">
          {product.supplierCatalogs?.length || 0}
        </span>
      ),
    },
    {
      accessorKey: 'items',
      header: 'Items',
      className: 'text-center',
      cell: (product: any) => (
        <span className="text-slate-700 dark:text-slate-300">
          {product.items?.length || 0}
        </span>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: (product: any) => (
        <div className="flex flex-col">
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {formatDistanceToNow(product.updatedAt, { addSuffix: true })}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'actions',
      header: '',
      className: 'text-right',
      cell: (product: any) => (
        <Link
          href={`/product-master/${product.id}`}
          className="text-sm font-medium text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          View →
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span>
          {products.length} {products.length === 1 ? 'product' : 'products'}
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="overflow-x-auto">
          <DataTable columns={columns} data={products} className="border-0" />
        </div>
      </div>
    </div>
  );
}

