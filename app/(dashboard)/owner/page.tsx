import { auth } from '@/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
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
  
  if (!isPlatformOwner(session?.user?.email)) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Only the platform owner can access the Owner Portal.
        </p>
      </div>
    );
  }
  
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
    <div className="space-y-8 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-owner-light dark:bg-owner/20">
          <Shield className="h-5 w-5 text-owner dark:text-owner" />
        </div>
        <PageHeader 
          title="Owner Portal" 
          subtitle="Platform administration and tenant management"
        />
      </div>

      {/* Platform Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-owner-light dark:bg-owner/20">
              <Building2 className="h-5 w-5 text-owner dark:text-owner" />
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
        
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
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

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
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

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
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
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-owner/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-owner/50"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-owner-light dark:bg-slate-800 dark:group-hover:bg-owner/20">
                <Building2 className="h-5 w-5 text-slate-600 transition-colors group-hover:text-owner dark:text-slate-400 dark:group-hover:text-owner" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-owner" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
              Tenant Management
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              View and manage all practices and their configurations
            </p>
            <div className="mt-3 text-2xl font-bold text-owner">{practices.length}</div>
          </Link>

          <Link
            href="/owner/users"
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-owner/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-owner/50"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-owner-light dark:bg-slate-800 dark:group-hover:bg-owner/20">
                <Users className="h-5 w-5 text-slate-600 transition-colors group-hover:text-owner dark:text-slate-400 dark:group-hover:text-owner" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-owner" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
              User Lifecycle
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Platform-wide user management and access control
            </p>
            <div className="mt-3 text-2xl font-bold text-owner">{totalUsers}</div>
          </Link>

          <Link
            href="/admin"
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-admin/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-admin/50"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-admin-light dark:bg-slate-800 dark:group-hover:bg-admin/20">
                <Package className="h-5 w-5 text-slate-600 transition-colors group-hover:text-admin dark:text-slate-400 dark:group-hover:text-admin" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-admin" />
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
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">Recent Practices</h2>
          <Link
            href="/owner/tenants"
            className="text-sm font-medium text-owner hover:text-owner-hover"
          >
            View all →
          </Link>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {practices.slice(0, 5).map((practice) => (
            <Link
              key={practice.id}
              href={`/owner/tenants/${practice.id}`}
              className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
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

