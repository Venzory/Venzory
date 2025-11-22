import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getInventoryService } from '@/src/services';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus, ClipboardCheck, Clipboard, MapPin } from 'lucide-react';
import { StockCountStatus } from '@prisma/client';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';

export const metadata = {
  title: 'Stock Count - Venzory',
};

export default async function StockCountPage() {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

  // Fetch recent count sessions using InventoryService
  const sessionsResult = await getInventoryService().getStockCountSessions(ctx);
  const sessions = sessionsResult ?? [];

  const getStatusVariant = (status: StockCountStatus): BadgeVariant => {
    switch (status) {
      case StockCountStatus.IN_PROGRESS:
        return 'warning';
      case StockCountStatus.COMPLETED:
        return 'success';
      case StockCountStatus.CANCELLED:
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const getStatusLabel = (status: StockCountStatus) => {
    switch (status) {
      case StockCountStatus.IN_PROGRESS:
        return 'In Progress';
      case StockCountStatus.COMPLETED:
        return 'Completed';
      case StockCountStatus.CANCELLED:
        return 'Cancelled';
      default:
        return status;
    }
  };

  const columns = [
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (session: any) => (
        <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(session.status)}>
                {getStatusLabel(session.status)}
            </Badge>
            <span className="text-sm text-slate-600 dark:text-slate-400">
                #{session.id.slice(0, 8)}
            </span>
        </div>
      )
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: (session: any) => (
        <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span className="font-medium text-slate-900 dark:text-slate-100">
                {session?.location?.name ?? 'Unknown location'}
            </span>
        </div>
      )
    },
    {
      accessorKey: 'items',
      header: 'Items Counted',
      cell: (session: any) => (
        <span className="text-sm text-slate-600 dark:text-slate-400">
            {session.lines?.length ?? 0} items
        </span>
      )
    },
    {
        accessorKey: 'date',
        header: 'Date',
        cell: (session: any) => (
            <span className="text-sm text-slate-600 dark:text-slate-400">
                {session.status === StockCountStatus.COMPLETED && session.completedAt
                ? `Completed ${format(new Date(session.completedAt), 'MMM d, yyyy')}`
                : `Started ${format(new Date(session.createdAt), 'MMM d, yyyy')}`}
            </span>
        )
    },
    {
        accessorKey: 'createdBy',
        header: 'Created By',
        cell: (session: any) => (
            <span className="text-sm text-slate-600 dark:text-slate-400">
                {session?.createdBy?.name || session?.createdBy?.email || 'Unknown user'}
            </span>
        )
    },
    {
        accessorKey: 'variance',
        header: 'Variance',
        cell: (session: any) => {
            const lines = session?.lines ?? [];
            const totalVariance = lines.reduce((sum: number, line: any) => {
                const variance = line?.variance ?? 0;
                return sum + Math.abs(variance);
            }, 0);
            
            if (totalVariance === 0) return <span className="text-sm text-slate-500">-</span>;
            
            return (
                <span className="text-amber-600 dark:text-amber-400 text-sm">
                    ±{totalVariance}
                </span>
            )
        }
    },
    {
        accessorKey: 'actions',
        header: '',
        className: 'text-right',
        cell: (session: any) => (
            <Link
                href={`/stock-count/${session.id}`}
                className="text-sm font-medium text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
                View Details →
            </Link>
        )
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Stock Count</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Perform physical stock counts and reconcile inventory discrepancies.
          </p>
        </div>
        <Link href="/stock-count/new">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Count
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-card-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/20">
              <Clipboard className="h-6 w-6 text-amber-600 dark:text-amber-300" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">In Progress</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {sessions.filter((s) => s?.status === StockCountStatus.IN_PROGRESS).length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-card-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/20">
              <ClipboardCheck className="h-6 w-6 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Completed (30d)</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {sessions.filter((s) => s?.status === StockCountStatus.COMPLETED).length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-card-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-100 p-3 dark:bg-sky-900/20">
              <MapPin className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Items Counted</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {sessions.reduce((sum, s) => sum + (s?.lines ?? []).length, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="rounded-lg border border-card-border bg-card">
        <div className="border-b border-card-border p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Count Sessions
          </h2>
        </div>

        {sessions.length === 0 ? (
          <EmptyState
            icon={Clipboard}
            title="No count sessions yet"
            description="Start your first stock count to track inventory"
          />
        ) : (
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={sessions} className="border-0" />
          </div>
        )}
      </div>
    </div>
  );
}


