import { auth } from '@/auth';
import { getSupplierContext } from '@/lib/supplier-guard';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/layout/PageHeader';
import { PricingTable } from './_components/pricing-table';
import { DollarSign, Package, TrendingUp, AlertCircle } from 'lucide-react';

export default async function PricingPage() {
  const session = await auth();
  const supplierContext = await getSupplierContext(session?.user?.email);

  if (!supplierContext) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
      </div>
    );
  }

  // Fetch supplier items with product info
  const supplierItems = await prisma.supplierItem.findMany({
    where: { globalSupplierId: supplierContext.supplierId, isActive: true },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          gtin: true,
          brand: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  // Calculate pricing stats
  const totalItems = supplierItems.length;
  const itemsWithPricing = supplierItems.filter(item => item.unitPrice !== null).length;
  const missingPricing = totalItems - itemsWithPricing;
  const avgPrice = itemsWithPricing > 0
    ? supplierItems.reduce((sum, item) => sum + (item.unitPrice?.toNumber() || 0), 0) / itemsWithPricing
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
          <DollarSign className="h-6 w-6 text-white" />
        </div>
        <PageHeader
          title="Pricing Management"
          subtitle="Update product prices and packaging details"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Total Products</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{totalItems}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">With Pricing</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{itemsWithPricing}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Missing Price</div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{missingPricing}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-violet-500" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Avg Price</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                €{avgPrice.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Missing Pricing Alert */}
      {missingPricing > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>{missingPricing} products</strong> are missing pricing information. Complete pricing to help customers make informed decisions.
            </p>
          </div>
        </div>
      )}

      {/* Pricing Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">Product Pricing</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Click on any price to edit. Changes are saved automatically.
          </p>
        </div>
        <PricingTable items={supplierItems} />
      </div>
    </div>
  );
}

