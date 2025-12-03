import { auth } from '@/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Shield } from 'lucide-react';
import { getTriageItems, getTriageStats, getSuppliersList } from './actions';
import { AuthorityClient } from './_components/authority-client';

export default async function AuthorityPage() {
  const session = await auth();
  
  // Check if user is platform owner
  const isOwner = isPlatformOwner(session?.user?.email);
  
  if (!isOwner) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Only platform staff can access the Product Identity Authority tool.
        </p>
      </div>
    );
  }

  // Fetch initial data
  const [{ items, total }, stats, suppliers] = await Promise.all([
    getTriageItems({}, 50, 0),
    getTriageStats(),
    getSuppliersList(),
  ]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-admin-light dark:bg-admin/20">
              <Shield className="h-5 w-5 text-admin dark:text-admin" />
            </div>
            <PageHeader 
              title="Product Identity Authority" 
              subtitle="Curate canonical product data and resolve catalog identity issues"
            />
          </div>
          
          {/* Stats badges */}
          <div className="flex items-center gap-3">
            <StatBadge label="Pending" value={stats.total} variant="warning" />
            <StatBadge label="Needs Review" value={stats.needsReview} variant="default" />
            <StatBadge label="Low Conf." value={stats.lowConfidence} variant="danger" />
          </div>
        </div>
      </div>

      {/* Main content - client component */}
      <AuthorityClient 
        initialItems={items} 
        initialTotal={total}
        suppliers={suppliers}
      />
    </div>
  );
}

function StatBadge({ 
  label, 
  value, 
  variant = 'default' 
}: { 
  label: string; 
  value: number; 
  variant?: 'default' | 'warning' | 'danger';
}) {
  const variantClasses = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${variantClasses[variant]}`}>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

