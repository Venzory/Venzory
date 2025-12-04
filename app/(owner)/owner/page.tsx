import { auth } from '@/auth';
import { ownerService } from '@/src/services';
import { PageHeader } from '@/components/layout/PageHeader';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { 
  Building2, 
  Users, 
  Package, 
  Database, 
  ArrowRight,
  Shield
} from 'lucide-react';

export default async function OwnerPage() {
  const session = await auth();
  
  // Access control is handled by the layout - if we get here, user is platform owner
  
  const [practices, overviewData, verifiedCount, needsReviewCount] = await Promise.all([
    ownerService.listPractices(session?.user?.email),
    ownerService.getProductDataOverview(session?.user?.email),
    prisma.product.count({ where: { gs1VerificationStatus: 'VERIFIED' } }),
    prisma.supplierItem.count({ where: { needsReview: true } }),
  ]);

  // Calculate some quick stats
  const totalUsers = practices.reduce((sum, p) => sum + p.userCount, 0);
  const totalLocations = practices.reduce((sum, p) => sum + p.locationCount, 0);
  const activePractices = practices.filter(p => p.status === 'Active').length;
  const totalProducts = overviewData.counts.products;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <PageHeader 
          title="Platform Dashboard" 
          subtitle="Platform administration and tenant management"
        />
      </div>

      {/* Platform Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-amber-200/50 bg-white p-5 shadow-sm dark:border-amber-800/30 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Practices</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{activePractices}</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {practices.length} total tenants
          </div>
        </div>
        
        <div className="rounded-xl border border-amber-200/50 bg-white p-5 shadow-sm dark:border-amber-800/30 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <Users className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Users</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalUsers}</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Across all practices
          </div>
        </div>

        <div className="rounded-xl border border-amber-200/50 bg-white p-5 shadow-sm dark:border-amber-800/30 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Products</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalProducts.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {verifiedCount} GS1 verified
          </div>
        </div>

        <div className="rounded-xl border border-amber-200/50 bg-white p-5 shadow-sm dark:border-amber-800/30 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Database className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Locations</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalLocations}</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Storage locations
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Platform Management</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/owner/tenants"
            className="group rounded-xl border border-amber-200/50 bg-white p-5 shadow-sm transition-all hover:border-amber-400 hover:shadow-md dark:border-amber-800/30 dark:bg-amber-950/20 dark:hover:border-amber-600"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 transition-colors group-hover:bg-amber-100 dark:bg-amber-900/30 dark:group-hover:bg-amber-800/50">
                <Building2 className="h-5 w-5 text-amber-600 transition-colors group-hover:text-amber-700 dark:text-amber-400 dark:group-hover:text-amber-300" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-amber-600" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
              Tenant Management
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              View and manage all practices and their configurations
            </p>
            <div className="mt-3 text-2xl font-bold text-amber-600 dark:text-amber-400">{practices.length}</div>
          </Link>

          <Link
            href="/owner/users"
            className="group rounded-xl border border-amber-200/50 bg-white p-5 shadow-sm transition-all hover:border-amber-400 hover:shadow-md dark:border-amber-800/30 dark:bg-amber-950/20 dark:hover:border-amber-600"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 transition-colors group-hover:bg-amber-100 dark:bg-amber-900/30 dark:group-hover:bg-amber-800/50">
                <Users className="h-5 w-5 text-amber-600 transition-colors group-hover:text-amber-700 dark:text-amber-400 dark:group-hover:text-amber-300" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-amber-600" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
              User Lifecycle
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Platform-wide user management and access control
            </p>
            <div className="mt-3 text-2xl font-bold text-amber-600 dark:text-amber-400">{totalUsers}</div>
          </Link>

          <Link
            href="/admin"
            className="group rounded-xl border border-indigo-200/50 bg-white p-5 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md dark:border-indigo-800/30 dark:bg-indigo-950/20 dark:hover:border-indigo-600"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 transition-colors group-hover:bg-indigo-100 dark:bg-indigo-900/30 dark:group-hover:bg-indigo-800/50">
                <Package className="h-5 w-5 text-indigo-600 transition-colors group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-300" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
              Admin Console
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Data stewardship and product master management
            </p>
            <div className="mt-3">
              {needsReviewCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {needsReviewCount} items need review
                </span>
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Practices Preview */}
      <div className="rounded-xl border border-amber-200/50 bg-white shadow-sm dark:border-amber-800/30 dark:bg-amber-950/20">
        <div className="flex items-center justify-between border-b border-amber-200/50 p-4 dark:border-amber-800/30">
          <h2 className="font-semibold text-slate-900 dark:text-white">Recent Practices</h2>
          <Link
            href="/owner/tenants"
            className="text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
          >
            View all →
          </Link>
        </div>
        <div className="divide-y divide-amber-200/30 dark:divide-amber-800/30">
          {practices.slice(0, 5).map((practice) => (
            <Link
              key={practice.id}
              href={`/owner/tenants/${practice.id}`}
              className="flex items-center justify-between p-4 transition-colors hover:bg-amber-50/50 dark:hover:bg-amber-900/20"
            >
              <div>
                <div className="font-medium text-slate-900 dark:text-white">{practice.name}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{practice.slug}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{practice.userCount} users</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{practice.locationCount} locations</div>
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${practice.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
