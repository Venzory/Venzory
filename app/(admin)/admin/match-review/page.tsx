import { auth } from '@/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReviewTable } from './_components/review-table';
import { getItemsNeedingReview, countItemsNeedingReview } from './actions';
import Link from 'next/link';
import { ArrowLeft, BarChart3, FileSearch } from 'lucide-react';

export default async function MatchReviewPage() {
  const session = await auth();
  
  // Check if user is platform owner
  const isOwner = isPlatformOwner(session?.user?.email);
  
  if (!isOwner) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Only the platform owner can access match review.
        </p>
      </div>
    );
  }

  // Fetch items needing review
  const [items, totalCount] = await Promise.all([
    getItemsNeedingReview(50),
    countItemsNeedingReview(),
  ]);

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/admin/gs1-quality"
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Quality
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-admin-light dark:bg-admin/20">
              <FileSearch className="h-5 w-5 text-admin dark:text-admin" />
            </div>
            <PageHeader 
              title="Match Review" 
              subtitle="Review and verify supplier item to product matches"
            />
          </div>
        </div>
        
        <Link
          href="/admin/gs1-quality"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
        >
          <BarChart3 className="h-4 w-4" />
          Quality Dashboard
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Total Needing Review
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {totalCount}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Showing
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {items.length}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Low Confidence (&lt;90%)
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {items.filter(i => i.matchConfidence !== null && i.matchConfidence < 0.9).length}
          </div>
        </div>
      </div>

      {/* Review Table */}
      <ReviewTable items={items} />
    </div>
  );
}

