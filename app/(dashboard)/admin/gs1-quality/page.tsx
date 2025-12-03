import { auth } from '@/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { ownerService } from '@/src/services';
import { PageHeader } from '@/components/layout/PageHeader';
import { QualityKPIs } from './_components/quality-kpis';
import { LowQualityTable } from './_components/low-quality-table';
import Link from 'next/link';
import { ArrowRight, Database } from 'lucide-react';

export default async function GS1QualityPage() {
  const session = await auth();
  
  // Check if user is platform owner
  const isOwner = isPlatformOwner(session?.user?.email);
  
  if (!isOwner) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Only the platform owner can access GS1 data quality management.
        </p>
      </div>
    );
  }

  // Fetch quality stats and low-quality products
  const [stats, lowQualityProducts] = await Promise.all([
    ownerService.getGS1QualityStats(session?.user?.email),
    ownerService.getLowQualityProducts(session?.user?.email, 20),
  ]);

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-admin-light dark:bg-admin/20">
            <Database className="h-5 w-5 text-admin dark:text-admin" />
          </div>
          <PageHeader 
            title="GS1 Data Quality" 
            subtitle="Monitor product data completeness and GS1 verification status"
          />
        </div>
        
        {stats.needsReviewCount > 0 && (
          <Link
            href="/admin/match-review"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-admin rounded-lg hover:bg-admin-hover transition-colors"
          >
            Review Matches
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold text-admin-light bg-admin-dark rounded-full">
              {stats.needsReviewCount}
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <QualityKPIs stats={stats} />

      {/* Low Quality Products Table */}
      <LowQualityTable products={lowQualityProducts} />
    </div>
  );
}

