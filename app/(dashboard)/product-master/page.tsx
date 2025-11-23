import { Gs1VerificationStatus } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getProductService } from '@/src/services';
import { canManageProducts } from '@/lib/rbac';

import { ProductFilters } from './_components/product-filters';
import { CreateProductForm } from './_components/create-product-form';
import { ProductList } from './_components/product-list';

interface ProductsPageProps {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
}

export default async function ProductMasterPage({ searchParams }: ProductsPageProps) {
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
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Product Master Data</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Manage global product records and GS1 data (Platform Owner).
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
                Only the platform owner can create new products.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


