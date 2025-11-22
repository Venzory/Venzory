'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Clipboard, MapPin } from 'lucide-react';
import { StockCountStatus } from '@prisma/client';

import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';

interface StockCountListProps {
  sessions: any[];
  currentSort: string;
  currentSortOrder: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export function StockCountList({
  sessions,
  currentSort,
  currentSortOrder,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
}: StockCountListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams);
    
    if (currentSort === column) {
       params.set('sortOrder', direction);
    } else {
      params.set('sortBy', column);
      params.set('sortOrder', 'asc');
    }
    
    params.delete('page');
    router.push(`/stock-count?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`/stock-count?${params.toString()}`);
  };

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

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={Clipboard}
        title="No count sessions yet"
        description="Start your first stock count to track inventory"
      />
    );
  }

  const columns = [
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
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
      accessorKey: 'location', // Assuming backend can sort by location relation? Probably not easily without joins. Let's assume location name sort is not supported yet or check repo.
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
        accessorKey: 'createdAt', // Renamed from 'date' to match DB field for sorting
        header: 'Date',
        enableSorting: true,
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
    <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
            <div>
                <span>
                    {totalItems} {totalItems === 1 ? 'session' : 'sessions'}
                </span>
                {totalItems > itemsPerPage && (
                    <span className="ml-2">
                    (Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)})
                    </span>
                )}
            </div>
        </div>

        <div className="rounded-lg border border-card-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
                <DataTable 
                    columns={columns} 
                    data={sessions} 
                    className="border-0" 
                    onSort={handleSort}
                    sortColumn={currentSort}
                    sortOrder={currentSortOrder as 'asc' | 'desc'}
                />
            </div>
        </div>

        <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
        />
    </div>
  );
}

