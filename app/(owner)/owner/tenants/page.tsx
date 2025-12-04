import { auth } from '@/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { ownerService } from '@/src/services';
import { PageHeader } from '@/components/layout/PageHeader';
import { PracticesTable } from '../_components/practices-table';
import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';

export default async function TenantsPage() {
  const session = await auth();
  
  if (!isPlatformOwner(session?.user?.email)) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Only the platform owner can access tenant management.
        </p>
      </div>
    );
  }
  
  const practices = await ownerService.listPractices(session?.user?.email);
  
  // Calculate stats
  const activePractices = practices.filter(p => p.status === 'Active').length;
  const totalUsers = practices.reduce((sum, p) => sum + p.userCount, 0);
  const totalLocations = practices.reduce((sum, p) => sum + p.locationCount, 0);

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          href="/owner"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Owner Portal
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-owner-light dark:bg-owner/20">
            <Building2 className="h-5 w-5 text-owner dark:text-owner" />
          </div>
          <PageHeader 
            title="Tenant Management" 
            subtitle="View and manage all practices on the platform"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Practices</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{practices.length}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Active</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activePractices}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Users</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalUsers}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Locations</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalLocations}</div>
        </div>
      </div>
      
      {/* Practices Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <PracticesTable practices={practices} />
      </div>
    </div>
  );
}

