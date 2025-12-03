import { auth } from '@/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/layout/PageHeader';
import Link from 'next/link';
import { ArrowLeft, Users, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { format } from 'date-fns';

export default async function PlatformUsersPage() {
  const session = await auth();
  
  if (!isPlatformOwner(session?.user?.email)) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Only the platform owner can access user lifecycle management.
        </p>
      </div>
    );
  }
  
  // Fetch all users with their practice memberships
  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          practice: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  // Calculate stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.memberships?.length > 0).length;
  const ownerUsers = users.filter(u => 
    u.memberships?.some(m => m.role === 'OWNER')
  ).length;

  const columns = [
    { 
      accessorKey: 'name', 
      header: 'User', 
      cell: (row: any) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-white">{row.name || 'Unnamed'}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{row.email}</div>
        </div>
      ) 
    },
    { 
      accessorKey: 'memberships', 
      header: 'Practices', 
      cell: (row: any) => (
        <div className="flex flex-wrap gap-1">
          {row.memberships?.length > 0 ? (
            row.memberships.slice(0, 2).map((m: any) => (
              <Badge key={m.id} variant="outline" className="text-xs">
                {m.practice?.name || 'Unknown'}
              </Badge>
            ))
          ) : (
            <span className="text-slate-400">No practices</span>
          )}
          {row.memberships?.length > 2 && (
            <span className="text-xs text-slate-500">+{row.memberships.length - 2} more</span>
          )}
        </div>
      ) 
    },
    { 
      accessorKey: 'role', 
      header: 'Highest Role', 
      cell: (row: any) => {
        const roles = row.memberships?.map((m: any) => m.role) || [];
        const roleOrder = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'];
        const highestRole = roleOrder.find(r => roles.includes(r)) || 'None';
        
        const roleColors: Record<string, string> = {
          OWNER: 'bg-owner-light text-owner dark:bg-owner/20',
          ADMIN: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
          MANAGER: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
          STAFF: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
        };
        
        return (
          <Badge className={roleColors[highestRole] || ''}>
            {highestRole}
          </Badge>
        );
      } 
    },
    { 
      accessorKey: 'createdAt', 
      header: 'Joined', 
      cell: (row: any) => (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {format(new Date(row.createdAt), 'PP')}
        </span>
      ) 
    },
    { 
      accessorKey: 'emailVerified', 
      header: 'Status', 
      cell: (row: any) => (
        <Badge variant={row.emailVerified ? 'success' : 'warning'}>
          {row.emailVerified ? 'Verified' : 'Pending'}
        </Badge>
      ) 
    },
  ];

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
            <Users className="h-5 w-5 text-owner dark:text-owner" />
          </div>
          <PageHeader 
            title="User Lifecycle" 
            subtitle="Platform-wide user management and access control"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Users</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalUsers}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">With Active Membership</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeUsers}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Practice Owners</div>
          <div className="text-2xl font-bold text-owner">{ownerUsers}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Without Practice</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalUsers - activeUsers}</div>
        </div>
      </div>
      
      {/* Users Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <DataTable columns={columns} data={users} />
      </div>
    </div>
  );
}

