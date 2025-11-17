import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getOrderService } from '@/src/services';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QuickSummaryPageProps {
  searchParams: Promise<{
    templateId?: string;
    orderIds?: string;
  }>;
}

export default async function QuickSummaryPage({ searchParams }: QuickSummaryPageProps) {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);
  const params = await searchParams;

  const { templateId, orderIds } = params;

  // Validate required params
  if (!templateId || !orderIds) {
    notFound();
  }

  // Parse order IDs
  const orderIdArray = orderIds.split(',').filter(Boolean);
  if (orderIdArray.length === 0) {
    notFound();
  }

  // Fetch template and orders
  let template;
  try {
    template = await getOrderService().getTemplateById(ctx, templateId);
  } catch (error) {
    notFound();
  }

  // Fetch all orders
  const orders = await Promise.all(
    orderIdArray.map(async (orderId) => {
      try {
        return await getOrderService().getOrderById(ctx, orderId);
      } catch (error) {
        return null;
      }
    })
  );

  // Filter out any failed fetches
  const validOrders = orders.filter((order) => order !== null);

  if (validOrders.length === 0) {
    notFound();
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ← Back to Orders
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Draft Orders Created
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Created {validOrders.length} draft {validOrders.length === 1 ? 'order' : 'orders'} from
          template <span className="font-medium text-slate-900 dark:text-slate-100">{template.name}</span>
        </p>
      </div>

      {/* Info Card */}
      <Card className="p-6 bg-sky-50 border-sky-200 dark:bg-sky-950/20 dark:border-sky-900">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg
              className="h-5 w-5 text-sky-600 dark:text-sky-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-100">
              One draft order per supplier
            </h3>
            <p className="mt-1 text-sm text-sky-800 dark:text-sky-200">
              Your template contained items from {validOrders.length} different{' '}
              {validOrders.length === 1 ? 'supplier' : 'suppliers'}. Each draft order is ready for
              you to review, edit, and send.
            </p>
          </div>
        </div>
      </Card>

      {/* Orders List */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Draft Orders</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Click on any order to review and edit before sending
          </p>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {validOrders.map((order) => {
            const supplierName =
              order.practiceSupplier?.customLabel ||
              order.practiceSupplier?.globalSupplier?.name ||
              'Unknown Supplier';
            const itemCount = order.items?.length ?? 0;

            return (
              <div
                key={order.id}
                className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {supplierName}
                    </h3>
                    <Badge variant="neutral">DRAFT</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <span>
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>
                    <span className="text-slate-400 dark:text-slate-600">•</span>
                    <span>Created {formatDistanceToNow(order.createdAt, { addSuffix: true })}</span>
                  </div>
                </div>
                <Link href={`/orders/${order.id}`}>
                  <Button variant="primary" size="md">
                    Review Order →
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <Link href="/orders">
          <Button variant="secondary" size="md">
            View All Orders
          </Button>
        </Link>
        <Link href="/orders/templates">
          <Button variant="secondary" size="md">
            Back to Templates
          </Button>
        </Link>
      </div>
    </section>
  );
}

