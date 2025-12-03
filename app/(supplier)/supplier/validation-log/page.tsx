import { auth } from '@/auth';
import { getSupplierContext } from '@/lib/supplier-guard';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/layout/PageHeader';
import { LogTable } from './_components/log-table';
import { ClipboardList, AlertTriangle, CheckCircle2, Clock, Filter } from 'lucide-react';

export default async function ValidationLogPage() {
  const session = await auth();
  const supplierContext = await getSupplierContext(session?.user?.email);

  if (!supplierContext) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
      </div>
    );
  }

  // Fetch supplier items that need review or have validation issues
  const validationItems = await prisma.supplierItem.findMany({
    where: { 
      globalSupplierId: supplierContext.supplierId,
    },
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
    orderBy: [
      { needsReview: 'desc' },
      { updatedAt: 'desc' },
    ],
    take: 100,
  });

  // Separate items by status
  const needsReviewItems = validationItems.filter(item => item.needsReview);
  const verifiedItems = validationItems.filter(item => !item.needsReview && item.matchMethod !== 'MANUAL');
  const manualItems = validationItems.filter(item => item.matchMethod === 'MANUAL' && !item.needsReview);

  const stats = {
    total: validationItems.length,
    needsReview: needsReviewItems.length,
    verified: verifiedItems.length,
    manual: manualItems.length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/20">
          <ClipboardList className="h-6 w-6 text-white" />
        </div>
        <PageHeader
          title="Validation Log"
          subtitle="Review and resolve product validation issues"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Total Items</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Needs Review</div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.needsReview}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Auto-Verified</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.verified}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Manual Match</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{stats.manual}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Needs Review Alert */}
      {stats.needsReview > 0 && (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 dark:border-amber-800/50 dark:from-amber-900/20 dark:to-orange-900/20">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                Products Require Review
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {stats.needsReview} product{stats.needsReview !== 1 ? 's' : ''} could not be automatically matched. Review and provide correct product information.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button className="border-b-2 border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 dark:border-teal-400 dark:text-teal-300">
          All ({stats.total})
        </button>
        <button className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
          Needs Review ({stats.needsReview})
        </button>
        <button className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
          Verified ({stats.verified})
        </button>
      </div>

      {/* Validation Table */}
      <LogTable items={validationItems} />
    </div>
  );
}

