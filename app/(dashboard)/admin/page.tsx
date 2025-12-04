import { auth } from '@/auth';
import { ownerService } from '@/src/services';
import { PageHeader } from '@/components/layout/PageHeader';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  FileSearch,
  Building2,
  BookOpen,
  Upload,
  Database
} from 'lucide-react';

export default async function AdminConsolePage() {
  const session = await auth();
  
  // Access control is handled by the layout - if we get here, user has admin console access

  // Get base data from owner service
  const overviewData = await ownerService.getProductDataOverview(session?.user?.email);

  // Get additional admin console stats
  const [verifiedCount, needsReviewCount] = await Promise.all([
    prisma.product.count({ where: { gs1VerificationStatus: 'VERIFIED' } }),
    prisma.supplierItem.count({ where: { needsReview: true } }),
  ]);

  const stats = {
    totalProducts: overviewData.counts.products,
    verifiedProducts: verifiedCount,
    needsReview: needsReviewCount,
    globalSuppliers: overviewData.counts.globalSuppliers,
    supplierItems: overviewData.counts.catalogEntries,
  };

  const quickActions = [
    {
      title: 'Product Master',
      description: 'Manage global product records and GS1 data',
      href: '/admin/product-master',
      icon: Package,
      count: stats.totalProducts,
      color: 'indigo',
    },
    {
      title: 'GS1 Quality',
      description: 'Monitor data completeness and verification',
      href: '/admin/gs1-quality',
      icon: CheckCircle2,
      count: stats.verifiedProducts,
      color: 'emerald',
    },
    {
      title: 'Match Review',
      description: 'Review supplier-to-product matches',
      href: '/admin/match-review',
      icon: FileSearch,
      count: stats.needsReview,
      color: 'amber',
    },
    {
      title: 'Global Suppliers',
      description: 'Manage platform-wide supplier accounts',
      href: '/admin/suppliers',
      icon: Building2,
      count: stats.globalSuppliers,
      color: 'sky',
    },
    {
      title: 'Supplier Catalog',
      description: 'Browse and manage supplier product entries',
      href: '/admin/supplier-catalog',
      icon: BookOpen,
      count: stats.supplierItems,
      color: 'violet',
    },
    {
      title: 'Bulk Import',
      description: 'Import supplier catalogs via CSV',
      href: '/admin/import',
      icon: Upload,
      color: 'slate',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
          <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <PageHeader 
          title="Data Dashboard" 
          subtitle="Product data authority and stewardship"
        />
      </div>

      {/* Data Quality Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-indigo-200/50 bg-white p-5 shadow-sm dark:border-indigo-800/30 dark:bg-indigo-950/20">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Products</div>
          <div className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
            {stats.totalProducts.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-indigo-200/50 bg-white p-5 shadow-sm dark:border-indigo-800/30 dark:bg-indigo-950/20">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">GS1 Verified</div>
          <div className="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.verifiedProducts.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-indigo-200/50 bg-white p-5 shadow-sm dark:border-indigo-800/30 dark:bg-indigo-950/20">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Needs Review</div>
          <div className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">
            {stats.needsReview.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-indigo-200/50 bg-white p-5 shadow-sm dark:border-indigo-800/30 dark:bg-indigo-950/20">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Supplier Items</div>
          <div className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
            {stats.supplierItems.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Data Stewardship</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-xl border border-indigo-200/50 bg-white p-5 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md dark:border-indigo-800/30 dark:bg-indigo-950/20 dark:hover:border-indigo-600"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 transition-colors group-hover:bg-indigo-100 dark:bg-indigo-900/30 dark:group-hover:bg-indigo-800/50">
                    <Icon className="h-5 w-5 text-indigo-600 transition-colors group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-300" />
                  </div>
                  {action.count !== undefined && (
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">
                      {action.count.toLocaleString()}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                  {action.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {action.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Attention Items */}
      {stats.needsReview > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800/50 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                Items Require Attention
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {stats.needsReview} supplier items need review for product matching.
              </p>
            </div>
            <Link
              href="/admin/match-review"
              className="ml-auto rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
            >
              Review Now
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
