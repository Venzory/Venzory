import { auth } from '@/auth';
import { getSupplierContext } from '@/lib/supplier-guard';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/layout/PageHeader';
import Link from 'next/link';
import {
  Upload,
  DollarSign,
  Truck,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Package,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

export default async function SupplierDashboardPage() {
  const session = await auth();
  const supplierContext = await getSupplierContext(session?.user?.email);

  if (!supplierContext) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          You do not have access to the Supplier Portal.
        </p>
      </div>
    );
  }

  // Fetch supplier stats
  const [catalogItems, recentUploads, reviewCount] = await Promise.all([
    prisma.supplierItem.count({
      where: { globalSupplierId: supplierContext.supplierId, isActive: true },
    }),
    prisma.supplierCatalogUpload.count({
      where: { globalSupplierId: supplierContext.supplierId },
    }),
    prisma.supplierItem.count({
      where: { globalSupplierId: supplierContext.supplierId, needsReview: true },
    }),
  ]);

  const stats = {
    catalogItems,
    recentUploads,
    needsReview: reviewCount,
    verified: catalogItems - reviewCount,
  };

  const quickActions = [
    {
      title: 'Upload Catalog',
      description: 'Import products via CSV file',
      href: '/supplier/catalog',
      icon: Upload,
      color: 'teal',
    },
    {
      title: 'Manage Pricing',
      description: 'Update prices and packaging',
      href: '/supplier/pricing',
      icon: DollarSign,
      color: 'emerald',
    },
    {
      title: 'Delivery Settings',
      description: 'Configure delivery channels',
      href: '/supplier/delivery',
      icon: Truck,
      color: 'sky',
    },
    {
      title: 'Validation Log',
      description: 'View validation history',
      href: '/supplier/validation-log',
      icon: ClipboardList,
      color: 'violet',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20">
          <Package className="h-6 w-6 text-white" />
        </div>
        <div>
          <PageHeader
            title={`Welcome, ${supplierContext.supplierName}`}
            subtitle="Manage your product catalog and delivery settings"
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-900/30">
              <Package className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Catalog Items</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.catalogItems.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Verified</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.verified.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Needs Review</div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.needsReview.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/30">
              <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Uploads</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.recentUploads.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attention Banner */}
      {stats.needsReview > 0 && (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 dark:border-amber-800/50 dark:from-amber-900/20 dark:to-orange-900/20">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                Items Need Your Attention
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {stats.needsReview} product{stats.needsReview !== 1 ? 's' : ''} require review. Resolve validation issues to improve data quality.
              </p>
            </div>
            <Link
              href="/supplier/validation-log"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-700"
            >
              Review Now
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-teal-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-teal-700"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-teal-100 dark:bg-slate-800 dark:group-hover:bg-teal-900/30">
                  <Icon className="h-5 w-5 text-slate-600 transition-colors group-hover:text-teal-600 dark:text-slate-400 dark:group-hover:text-teal-400" />
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

      {/* GS1 Suggestions Panel - Coming Soon Placeholder */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30">
            <Sparkles className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                GS1 Data Suggestions
              </h3>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                Coming Soon
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              AI-powered suggestions to enrich your product data with GS1 attributes, improving discoverability and compliance across the supply chain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

