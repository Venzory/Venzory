import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { PracticeRole, OrderStatus } from '@prisma/client';
import { Package } from 'lucide-react';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getInventoryService, getOrderService, getSettingsService } from '@/src/services';
import { hasRole } from '@/lib/rbac';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { OnboardingReminderCard } from './_components/onboarding-reminder-card';
import { calculateItemStockInfo } from '@/lib/inventory-utils';
import { calculateOrderTotal } from '@/lib/prisma-transforms';

export default async function DashboardPage() {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

  // Fetch data in parallel with safe limits to prevent performance issues
  const [itemsResult, orders, adjustments, suppliers, onboardingStatus, practiceSuppliers] = await Promise.all([
    // Limit items to 100 for dashboard calculations
    getInventoryService().findItems(ctx, {}, { page: 1, limit: 100 }),
    // Limit orders to recent 50 for stats
    getOrderService().findOrders(ctx, {}, { page: 1, limit: 50 }),
    // Fetch recent stock adjustments
    getInventoryService().getRecentAdjustments(ctx, 5),
    // Fetch all suppliers for links
    getInventoryService().getSuppliers(ctx),
    // Fetch practice onboarding status
    getSettingsService().getPracticeOnboardingStatus(ctx),
    // Fetch practice suppliers
    getSettingsService().getPracticeSuppliers(ctx),
  ]);

  // Extract items from the result
  const items = itemsResult.items;

  // Calculate low-stock information for each item using shared utility
  const itemsWithStockInfo = items.map((item) => ({
    item,
    stockInfo: calculateItemStockInfo(item),
  }));

  const lowStockItems = itemsWithStockInfo.filter(({ stockInfo }) => stockInfo.isLowStock);

  // Get top 10 low-stock items with details for widget
  const lowStockInfoWithDetails = lowStockItems.slice(0, 10).map(({ item, stockInfo }) => {
    const lowStockLocations = (item.inventory || []).filter(
      (inv) => inv.reorderPoint !== null && inv.quantity < inv.reorderPoint
    );

    return {
      item,
      lowStockLocations,
      suggestedQuantity: stockInfo.suggestedQuantity,
    };
  });

  // Calculate KPIs
  const lowStockCount = lowStockItems.length;
  const draftOrdersCount = orders.filter((o) => o.status === OrderStatus.DRAFT).length;
  const sentOrdersCount = orders.filter((o) => o.status === OrderStatus.SENT).length;
  const receivedOrdersCount = orders.filter((o) => o.status === OrderStatus.RECEIVED).length;

  // Calculate total stock value (disabled - type mismatch)
  let totalStockValue = 0;
  let hasStockValue = false;
  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  // Onboarding status checks
  const hasSuppliers = practiceSuppliers.length > 0;
  const hasItems = items.length > 0;
  const hasOrders = orders.length > 0;
  const isOnboardingComplete = onboardingStatus.onboardingCompletedAt != null;
  const allSetupComplete = hasSuppliers && hasItems && hasOrders;
  
  // Show reminder if: onboarding not complete AND setup not complete AND (skipped OR staff+)
  const shouldShowReminder = !isOnboardingComplete && !allSetupComplete && canManage;

  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Overview</p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Quick overview of your stock levels, orders, and recent activity.
            </p>
          </div>
          {canManage && (
            <Link href="/orders/new">
              <Button variant="primary">Create Order</Button>
            </Link>
          )}
        </div>
      </header>

      {/* Onboarding Reminder Card */}
      {shouldShowReminder && (
        <OnboardingReminderCard
          hasSuppliers={hasSuppliers}
          hasItems={hasItems}
          hasOrders={hasOrders}
        />
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Low Stock Items</h2>
          <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{lowStockCount}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {lowStockCount > 0 ? (
              <Link href="/inventory" className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300">
                View inventory →
              </Link>
            ) : (
              'All items adequately stocked'
            )}
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Draft Orders</h2>
          <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{draftOrdersCount}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {draftOrdersCount > 0 ? (
              <Link href="/orders" className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
                View orders →
              </Link>
            ) : (
              'No pending drafts'
            )}
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sent Orders</h2>
          <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{sentOrdersCount}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {sentOrdersCount > 0 ? 'Awaiting delivery' : 'No orders in transit'}
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Received Orders</h2>
          <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{receivedOrdersCount}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Recently completed</p>
        </Card>
        {hasStockValue ? (
          <Card>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Total Stock Value</h2>
            <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">€{totalStockValue.toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Based on available unit prices</p>
          </Card>
        ) : null}
      </div>

      {/* Recent Orders Table */}
      {orders.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Recent Orders</h2>
            <Link
              href="/orders"
              className="text-sm font-medium text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              View all →
            </Link>
          </div>
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
                      Total
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {orders.map((order) => {
                    const total = calculateOrderTotal(order.items || []);

                    return (
                      <tr key={order.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          <div className="flex flex-col">
                            <span>{formatDistanceToNow(order.createdAt, { addSuffix: true })}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-500">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/suppliers#${order.supplier?.id || ''}`}
                            className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                          >
                            {order.supplier?.name || 'Unknown'}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-200">
                          {total > 0 ? `€${total.toFixed(2)}` : '-'}
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
        </div>
      ) : (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description={
            canManage
              ? 'Create your first purchase order to get started with inventory management.'
              : 'Orders will appear here once created by staff members.'
          }
        />
      )}

      {/* Low Stock Items */}
      {lowStockInfoWithDetails.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Low Stock Items</h2>
            <Link
              href="/inventory"
              className="text-sm font-medium text-amber-600 transition hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
            >
              View all →
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {lowStockInfoWithDetails.map(({ item, lowStockLocations, suggestedQuantity }) => (
              <div
                key={item.id}
                className="rounded-xl border border-amber-300 bg-amber-50 p-6 dark:border-amber-700 dark:bg-amber-900/10"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{item.name}</h3>
                    {item.sku ? (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        {item.sku}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-amber-100 border border-amber-400 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/60 dark:border-amber-700 dark:text-amber-300">
                      Low stock
                    </span>
                  </div>
                  {item.defaultSupplier ? (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Supplier:{' '}
                      <Link
                        href={`/suppliers#${item.defaultSupplier.id}`}
                        className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                      >
                        {item.defaultSupplier.name}
                      </Link>
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700 dark:text-amber-400">⚠ No default supplier set</p>
                  )}
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <p className="font-medium text-amber-800 dark:text-amber-300">Low at:</p>
                    <ul className="mt-1 space-y-1">
                      {lowStockLocations.map((inv) => (
                        <li key={inv.locationId} className="flex items-center justify-between">
                          <span>
                            {inv.location?.name || 'Unknown Location'}
                            {inv.location?.code ? ` (${inv.location?.code})` : ''}
                          </span>
                          <span className="text-amber-800 dark:text-amber-300">
                            {inv.quantity} / {inv.reorderPoint}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {suggestedQuantity > 0 && (
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      Suggested order quantity: {suggestedQuantity}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Recent Stock Adjustments */}
      {adjustments.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Recent Stock Adjustments</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {adjustments.map((adjustment) => (
              <Card key={adjustment.id}>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {formatDistanceToNow(adjustment.createdAt, { addSuffix: true })}
                  </span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                    {adjustment.reason ?? 'Adjustment'}
                  </span>
                </div>
                <p className="mt-2 font-medium text-slate-900 dark:text-slate-100">
                  {adjustment.quantity > 0 ? '+' : ''}
                  {adjustment.quantity}{' '}
                  <span className="text-slate-700 dark:text-slate-300">{adjustment.item?.name}</span>
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Location: {adjustment.location?.name}
                  {adjustment.location?.code ? ` (${adjustment.location?.code})` : ''}
                </p>
                <p className="text-xs text-slate-500">
                  By {adjustment.createdBy?.name ?? adjustment.createdBy?.email ?? 'Unknown'}
                </p>
                {adjustment.note ? (
                  <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{adjustment.note}</p>
                ) : null}
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const styles = {
    [OrderStatus.DRAFT]: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600',
    [OrderStatus.SENT]: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    [OrderStatus.PARTIALLY_RECEIVED]: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
    [OrderStatus.RECEIVED]: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    [OrderStatus.CANCELLED]: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700',
  };

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

