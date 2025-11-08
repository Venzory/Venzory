import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus, PackageCheck, Package, MapPin } from 'lucide-react';
import { GoodsReceiptStatus } from '@prisma/client';

export const metadata = {
  title: 'Receiving - Remcura',
};

export default async function ReceivingPage() {
  const { practiceId } = await requireActivePractice();

  // Fetch recent receipts (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const receipts = await prisma.goodsReceipt.findMany({
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
      supplier: {
        select: {
          name: true,
        },
      },
      lines: {
        select: {
          id: true,
          quantity: true,
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

  const getStatusColor = (status: GoodsReceiptStatus) => {
    switch (status) {
      case GoodsReceiptStatus.DRAFT:
        return 'bg-amber-900/20 text-amber-300 border-amber-800';
      case GoodsReceiptStatus.CONFIRMED:
        return 'bg-green-900/20 text-green-300 border-green-800';
      case GoodsReceiptStatus.CANCELLED:
        return 'bg-slate-700/20 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-700/20 text-slate-400 border-slate-700';
    }
  };

  const getStatusLabel = (status: GoodsReceiptStatus) => {
    switch (status) {
      case GoodsReceiptStatus.DRAFT:
        return 'Draft';
      case GoodsReceiptStatus.CONFIRMED:
        return 'Confirmed';
      case GoodsReceiptStatus.CANCELLED:
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Receiving</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Receive deliveries and manage goods receipts
          </p>
        </div>
        <Link
          href="/receiving/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700"
          style={{ minHeight: '48px' }}
        >
          <Plus className="h-5 w-5" />
          New Receipt
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-card-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-900/20 p-3">
              <Package className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Draft Receipts</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {receipts.filter((r) => r.status === GoodsReceiptStatus.DRAFT).length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-card-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-900/20 p-3">
              <PackageCheck className="h-6 w-6 text-green-300" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Confirmed (30d)</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {receipts.filter((r) => r.status === GoodsReceiptStatus.CONFIRMED).length}
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
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Items</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {receipts.reduce((sum, r) => sum + r.lines.length, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Receipts List */}
      <div className="rounded-lg border border-card-border bg-card">
        <div className="border-b border-card-border p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Recent Receipts
          </h2>
        </div>

        {receipts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
              No receipts yet
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Create your first goods receipt to get started
            </p>
            <Link
              href="/receiving/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700"
              style={{ minHeight: '48px' }}
            >
              <Plus className="h-5 w-5" />
              New Receipt
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-card-border">
            {receipts.map((receipt) => {
              const totalQuantity = receipt.lines.reduce((sum, line) => sum + line.quantity, 0);

              return (
                <Link
                  key={receipt.id}
                  href={`/receiving/${receipt.id}`}
                  className="block p-6 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(receipt.status)}`}
                        >
                          {getStatusLabel(receipt.status)}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          #{receipt.id.slice(0, 8)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {receipt.location.name}
                          </span>
                        </div>
                        {receipt.supplier && (
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Supplier: {receipt.supplier.name}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span>{receipt.lines.length} items</span>
                        <span>{totalQuantity} units</span>
                        <span>
                          {receipt.status === GoodsReceiptStatus.CONFIRMED && receipt.receivedAt
                            ? `Received ${format(new Date(receipt.receivedAt), 'MMM d, yyyy')}`
                            : `Created ${format(new Date(receipt.createdAt), 'MMM d, yyyy')}`}
                        </span>
                      </div>

                      {receipt.notes && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {receipt.notes}
                        </p>
                      )}
                    </div>

                    <div className="text-right text-sm text-slate-600 dark:text-slate-400">
                      <div>{receipt.createdBy.name || receipt.createdBy.email}</div>
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

