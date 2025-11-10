import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { PracticeRole, Gs1VerificationStatus } from '@prisma/client';
import { Package } from 'lucide-react';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getProductService } from '@/src/services';
import { hasRole, canManageProducts } from '@/lib/rbac';

import { ProductFilters } from './_components/product-filters';
import { CreateProductForm } from './_components/create-product-form';
import { Gs1StatusBadge } from './_components/gs1-status-badge';
import { EmptyState } from '@/components/ui/empty-state';

interface ProductsPageProps {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);
  const params = searchParams ? await searchParams : {};
  
  const { q, status } = params;

  // Query products using ProductService with filters
  const products = await getProductService().findProducts(ctx, {
    search: q?.trim(),
    gs1VerificationStatus: status && status !== 'all' ? status as Gs1VerificationStatus : undefined,
  });

  const canManage = canManageProducts({
    memberships: session.user.memberships,
    practiceId,
  });

  const hasActiveFilters = Boolean(q || status);

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Product Catalog</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              View canonical product information from supplier catalogs and GS1 data.
            </p>
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
                Only administrators can create new products. Products are typically created automatically when items are added with a GTIN.
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
            : 'Products will appear here when suppliers offer items with GTINs or when you create them manually.'
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span>
          {products.length} {products.length === 1 ? 'product' : 'products'}
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  GTIN
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  GS1 Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Suppliers
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  Updated
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {products.map((product) => {
                const supplierCount = product.supplierCatalogs?.length || 0;
                const itemCount = product.items?.length || 0;

                return (
                  <tr
                    key={product.id}
                    className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                        {product.gtin || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Gs1StatusBadge status={product.gs1VerificationStatus} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-slate-700 dark:text-slate-300">
                        {supplierCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-slate-700 dark:text-slate-300">
                        {itemCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      <div className="flex flex-col">
                        <span className="text-xs">
                          {formatDistanceToNow(product.updatedAt, { addSuffix: true })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/products/${product.id}`}
                        className="text-sm font-medium text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


