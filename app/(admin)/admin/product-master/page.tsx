import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Gs1VerificationStatus } from '@prisma/client';
import { Package } from 'lucide-react';

import { requireActivePractice } from '@/lib/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getProductService } from '@/src/services';

import { ProductFilters } from './_components/product-filters';
import { CreateProductForm } from './_components/create-product-form';
import { Gs1StatusBadge } from './_components/gs1-status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable } from '@/components/ui/data-table';

interface ProductsPageProps {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
}

export default async function AdminProductMasterPage({ searchParams }: ProductsPageProps) {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);
  const params = searchParams ? await searchParams : {};
  
  const { q, status } = params;

  // Check if user is PLATFORM OWNER
  const isOwner = isPlatformOwner(session.user.email);

  if (!isOwner) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Only the platform owner can access product master data.
        </p>
      </div>
    );
  }

  // Query products using ProductService with filters
  const products = await getProductService().findProducts(ctx, {
    search: q?.trim(),
    gs1VerificationStatus: status && status !== 'all' ? status as Gs1VerificationStatus : undefined,
  });

  const canManage = isOwner; // Only owner can manage

  const hasActiveFilters = Boolean(q || status);

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-admin-light dark:bg-admin/20">
              <Package className="h-5 w-5 text-admin dark:text-admin" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Product Master Data</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Manage global product records and GS1 data (Data Steward).
              </p>
            </div>
          </div>
        </div>

        <ProductFilters />

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <ProductList
            products={products}
            canManage={canManage}
            hasActiveFilters={hasActiveFilters}
          />
          {canManage ? (
            <CreateProductForm />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:shadow-none">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">View Only</h2>
              <p className="mt-2">
                Only the platform owner can create new products.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProductList({
  products,
  canManage,
  hasActiveFilters,
}: {
  products: any[];
  canManage: boolean;
  hasActiveFilters: boolean;
}) {
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
          href={`/admin/product-master/${product.id}`}
          className="text-sm font-medium text-admin transition hover:text-admin-hover"
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

