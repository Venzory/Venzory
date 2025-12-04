import { auth } from '@/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { getSupplierCorrectionRepository } from '@/src/repositories/suppliers';
import { PageHeader } from '@/components/layout/PageHeader';
import { CorrectionReviewTable } from './_components/correction-review-table';
import Link from 'next/link';
import { ArrowLeft, FileEdit, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default async function SupplierCorrectionsPage() {
  const session = await auth();

  // Check if user is platform owner
  const isOwner = isPlatformOwner(session?.user?.email);

  if (!isOwner) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Only the platform owner can access supplier corrections review.
        </p>
      </div>
    );
  }

  // Fetch pending corrections for review
  const repo = getSupplierCorrectionRepository();
  const [pendingCorrections, stats] = await Promise.all([
    repo.findPendingForReview(100),
    // Get all-time stats (approximate using count)
    Promise.all([
      repo.countPending(),
    ]).then(([pending]) => ({
      pending,
    })),
  ]);

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <Link
              href="/admin/supplier-catalog"
              className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Catalog
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-admin-light dark:bg-admin/20">
              <FileEdit className="h-5 w-5 text-admin dark:text-admin" />
            </div>
            <PageHeader
              title="Supplier Corrections"
              subtitle="Review and approve supplier-submitted data corrections"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Pending Review
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.pending}
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Showing
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {pendingCorrections.length}
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-slate-400" />
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Unique Suppliers
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {new Set(pendingCorrections.map((c) => c.globalSupplierId)).size}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info box */}
      {pendingCorrections.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800/50 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">Review supplier corrections carefully</p>
              <p className="mt-1 text-blue-700 dark:text-blue-300">
                Approved changes will be applied to the supplier catalog immediately. 
                GTIN changes may require additional product master updates.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Corrections Table */}
      <CorrectionReviewTable corrections={pendingCorrections} />
    </div>
  );
}

