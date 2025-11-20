import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getReceivingService } from '@/src/services';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus, PackageCheck, Package, MapPin } from 'lucide-react';
import { GoodsReceiptStatus } from '@prisma/client';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Receiving - Venzory',
};

export default async function ReceivingPage() {
  const ctx = await buildRequestContext();

  // Fetch recent receipts (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const receipts = await getReceivingService().findGoodsReceipts(ctx, {
    dateFrom: thirtyDaysAgo,
  }).catch(() => []);

  const getStatusVariant = (status: GoodsReceiptStatus): BadgeVariant => {
    switch (status) {
      case GoodsReceiptStatus.DRAFT:
        return 'warning';
      case GoodsReceiptStatus.CONFIRMED:
        return 'success';
      case GoodsReceiptStatus.CANCELLED:
        return 'neutral';
      default:
        return 'neutral';
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Receiving</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Record incoming deliveries and manage goods receipts.
          </p>
        </div>
        <Link href="/receiving/new">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Receipt
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-card-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/20">
              <Package className="h-6 w-6 text-amber-600 dark:text-amber-300" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Draft Receipts</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {receipts?.filter((r) => r.status === GoodsReceiptStatus.DRAFT).length ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-card-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/20">
              <PackageCheck className="h-6 w-6 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Confirmed (30d)</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {receipts?.filter((r) => r.status === GoodsReceiptStatus.CONFIRMED).length ?? 0}
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
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Items</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {receipts?.reduce((sum, r) => sum + (r.lines?.length ?? 0), 0) ?? 0}
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
          <EmptyState
            icon={Package}
            title="No receipts yet"
            description="Create your first goods receipt to get started"
          />
        ) : (
          <div className="divide-y divide-card-border">
            {receipts.map((receipt) => {
              const totalQuantity = receipt.lines?.reduce((sum, line) => sum + line.quantity, 0) || 0;

              return (
                <Link
                  key={receipt.id}
                  href={`/receiving/${receipt.id}`}
                  className="block p-6 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant={getStatusVariant(receipt.status)}>
                          {getStatusLabel(receipt.status)}
                        </Badge>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          #{receipt.id.slice(0, 8)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {receipt.location?.name || 'Unknown'}
                          </span>
                        </div>
                        {receipt.practiceSupplier && (
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Supplier: {receipt.practiceSupplier.customLabel || receipt.practiceSupplier.globalSupplier.name}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span>{receipt.lines?.length || 0} items</span>
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
                      <div>{receipt.createdBy?.name || receipt.createdBy?.email || 'Unknown'}</div>
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


