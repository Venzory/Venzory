import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { PracticeRole, OrderStatus } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getOrderService } from '@/src/services';
import { hasRole } from '@/lib/rbac';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { calculateOrderTotal } from '@/lib/prisma-transforms';
import { selectQuickTemplates } from './_utils/quick-reorder';
import { QuickOrderButton } from './_components/quick-order-button';

export default async function OrdersPage() {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

  const orders = await getOrderService().findOrders(ctx, {});

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  // Fetch templates for quick reorder (only if user can manage orders)
  let quickTemplates: any[] = [];
  if (canManage) {
    const allTemplates = await getOrderService().findTemplates(ctx);
    quickTemplates = selectQuickTemplates(allTemplates, 5);
  }

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Orders</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Track purchase orders from draft through receipt across suppliers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/orders/templates">
            <Button variant="secondary">Order Templates</Button>
          </Link>
          {canManage && (
            <Link href="/orders/new">
              <Button variant="primary">Create Order</Button>
            </Link>
          )}
        </div>
      </div>

      {canManage && quickTemplates.length > 0 && (
        <QuickReorderSection templates={quickTemplates} />
      )}

      <OrdersList orders={orders} canManage={canManage} />
    </section>
  );
}

function OrdersList({
  orders,
  canManage,
}: {
  orders: any[];
  canManage: boolean;
}) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No orders yet"
        description={
          canManage
            ? 'Start tracking your inventory by creating your first purchase order. You can order from any linked supplier.'
            : 'Orders will appear here once created by staff members.'
        }
        action={
          canManage ? (
            <Link href="/orders/new">
              <Button variant="primary">Create Your First Order</Button>
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Supplier
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Items
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Created By
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {orders.map((order) => {
              const itemCount = order.items?.length ?? 0;
              const total = calculateOrderTotal(order.items || []);

              // Get supplier display name and ID for linking
              const supplierName = order.practiceSupplier?.customLabel || order.practiceSupplier?.globalSupplier?.name || 'Unknown Supplier';
              const supplierLinkId = order.practiceSupplier?.id || '';

              return (
                <tr key={order.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col">
                      <span>{formatDistanceToNow(order.createdAt, { addSuffix: true })}</span>
                      <span className="text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {supplierLinkId ? (
                      <Link
                        href={`/suppliers#${supplierLinkId}`}
                        className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                      >
                        {supplierName}
                      </Link>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400">{supplierName}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-200">
                    {total > 0 ? `€${total.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs dark:text-slate-400">
                    {order.createdBy?.name || order.createdBy?.email || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-sm font-medium text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const variantMap = {
    [OrderStatus.DRAFT]: 'neutral' as const,
    [OrderStatus.SENT]: 'info' as const,
    [OrderStatus.PARTIALLY_RECEIVED]: 'warning' as const,
    [OrderStatus.RECEIVED]: 'success' as const,
    [OrderStatus.CANCELLED]: 'error' as const,
  };

  return <Badge variant={variantMap[status]}>{status.replace('_', ' ')}</Badge>;
}

function QuickReorderSection({ templates }: { templates: any[] }) {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Quick Reorder</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Reorder from your recent templates
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
            >
              <div className="flex-1 min-w-0 mr-3">
                <Link
                  href={`/orders/templates/${template.id}`}
                  className="block font-medium text-slate-900 hover:text-sky-600 dark:text-white dark:hover:text-sky-400 truncate"
                >
                  {template.name}
                </Link>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  {template.items.length} {template.items.length === 1 ? 'item' : 'items'}
                </p>
              </div>
              <QuickOrderButton
                templateId={template.id}
                templateName={template.name}
                size="sm"
                variant="primary"
              />
            </div>
          ))}
        </div>
        <div className="text-center">
          <Link
            href="/orders/templates"
            className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            View all templates →
          </Link>
        </div>
      </div>
    </Card>
  );
}

