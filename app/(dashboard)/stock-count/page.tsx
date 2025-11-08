import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus, ClipboardCheck, Clipboard, MapPin } from 'lucide-react';
import { StockCountStatus } from '@prisma/client';

export const metadata = {
  title: 'Stock Count - Remcura',
};

export default async function StockCountPage() {
  const { practiceId } = await requireActivePractice();

  // Fetch recent count sessions (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sessions = await prisma.stockCountSession.findMany({
    where: {
      practiceId,
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    include: {
      location: {
        select: {
          name: true,
        },
      },
      lines: {
        select: {
          id: true,
          variance: true,
        },
      },
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const getStatusColor = (status: StockCountStatus) => {
    switch (status) {
      case StockCountStatus.IN_PROGRESS:
        return 'bg-amber-900/20 text-amber-300 border-amber-800';
      case StockCountStatus.COMPLETED:
        return 'bg-green-900/20 text-green-300 border-green-800';
      case StockCountStatus.CANCELLED:
        return 'bg-slate-700/20 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-700/20 text-slate-400 border-slate-700';
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Stock Count</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Perform quick stock counts and adjust inventory
          </p>
        </div>
        <Link
          href="/stock-count/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700"
          style={{ minHeight: '48px' }}
        >
          <Plus className="h-5 w-5" />
          New Count
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-card-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-900/20 p-3">
              <Clipboard className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">In Progress</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {sessions.filter((s) => s.status === StockCountStatus.IN_PROGRESS).length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-card-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-900/20 p-3">
              <ClipboardCheck className="h-6 w-6 text-green-300" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Completed (30d)</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {sessions.filter((s) => s.status === StockCountStatus.COMPLETED).length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-card-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-900/20 p-3">
              <MapPin className="h-6 w-6 text-sky-300" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Items Counted</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {sessions.reduce((sum, s) => sum + s.lines.length, 0)}
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
          <div className="p-12 text-center">
            <Clipboard className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
              No count sessions yet
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Start your first stock count to track inventory
            </p>
            <Link
              href="/stock-count/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700"
              style={{ minHeight: '48px' }}
            >
              <Plus className="h-5 w-5" />
              New Count
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-card-border">
            {sessions.map((session) => {
              const totalVariance = session.lines.reduce((sum, line) => sum + Math.abs(line.variance), 0);

              return (
                <Link
                  key={session.id}
                  href={`/stock-count/${session.id}`}
                  className="block p-6 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(session.status)}`}
                        >
                          {getStatusLabel(session.status)}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          #{session.id.slice(0, 8)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {session.location.name}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span>{session.lines.length} items counted</span>
                        {totalVariance > 0 && (
                          <span className="text-amber-600 dark:text-amber-400">
                            ±{totalVariance} variance
                          </span>
                        )}
                        <span>
                          {session.status === StockCountStatus.COMPLETED && session.completedAt
                            ? `Completed ${format(new Date(session.completedAt), 'MMM d, yyyy')}`
                            : `Started ${format(new Date(session.createdAt), 'MMM d, yyyy')}`}
                        </span>
                      </div>

                      {session.notes && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {session.notes}
                        </p>
                      )}
                    </div>

                    <div className="text-right text-sm text-slate-600 dark:text-slate-400">
                      <div>{session.createdBy.name || session.createdBy.email}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

