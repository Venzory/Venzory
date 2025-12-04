import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getInventoryService } from '@/src/services';
import Link from 'next/link';
import { Plus, Clipboard, ClipboardCheck, MapPin } from 'lucide-react';
import { StockCountStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { parseListParams } from '@/lib/url-params';
import { StockCountList } from './_components/stock-count-list';

export const metadata = {
  title: 'Stock Count - Venzory',
};

export default async function StockCountPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);
  const params = searchParams ? await searchParams : {};

  const { page: currentPage, limit: itemsPerPage, sortBy, sortOrder } = parseListParams(params);

  const [sessions, totalSessions] = await Promise.all([
    getInventoryService().getStockCountSessions(
        ctx, 
        {
            pagination: { page: currentPage, limit: itemsPerPage },
            sorting: sortBy ? { sortBy, sortOrder: sortOrder as 'asc' | 'desc' } : undefined
        }
    ),
    getInventoryService().countStockCountSessions(ctx)
  ]);

  const totalPages = Math.ceil(totalSessions / itemsPerPage);

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
        <Link href="/app/stock-count/new">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Count
          </Button>
        </Link>
      </div>

      {/* Stats (based on current view/page) */}
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
              <p className="text-sm text-slate-600 dark:text-slate-400">Completed (Recent)</p>
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
              <p className="text-sm text-slate-600 dark:text-slate-400">Items Counted (View)</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {sessions.reduce((sum, s) => sum + (s?.lines ?? []).length, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <StockCountList 
        sessions={sessions}
        currentSort={sortBy || 'createdAt'}
        currentSortOrder={sortOrder || 'desc'}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalSessions}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
}
