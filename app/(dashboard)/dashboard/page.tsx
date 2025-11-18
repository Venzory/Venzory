import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { PracticeRole, OrderStatus } from '@prisma/client';
import { Package, TrendingDown, ShoppingCart, Inbox } from 'lucide-react';

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
import { getOrderSupplierDisplay } from './_utils/order-display';
import { calculateAwaitingReceiptCount, AWAITING_RECEIPT_LINK } from './_utils/kpi-utils';
import { buildLowStockOrderHref } from './_utils/low-stock-actions';
import { OrderStatusBadge } from './_utils/order-status-badge';

export default async function DashboardPage() {
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

  // Fetch data in parallel with safe limits to prevent performance issues
  const [itemsResult, orders, adjustments, onboardingStatus, setupProgress] = await Promise.all([
    // Limit items to 100 for dashboard calculations
    getInventoryService().findItems(ctx, {}, { page: 1, limit: 100 }),
    // Limit orders to recent 50 for stats
    getOrderService().findOrders(ctx, {}, { page: 1, limit: 50 }),
    // Fetch recent stock adjustments
    getInventoryService().getRecentAdjustments(ctx, 5),
    // Fetch practice onboarding status
    getSettingsService().getPracticeOnboardingStatus(ctx),
    // Fetch setup progress
    getSettingsService().getSetupProgress(ctx),
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
  const awaitingReceiptCount = calculateAwaitingReceiptCount(orders);
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
  const hasLocations = setupProgress.hasLocations ?? false;
  const hasSuppliers = setupProgress.hasSuppliers ?? false;
  const hasItems = setupProgress.hasItems ?? false;
  const hasReceivedOrders = setupProgress.hasReceivedOrders ?? false;
  const isOnboardingComplete = onboardingStatus.onboardingCompletedAt != null;
  const isOnboardingSkipped = onboardingStatus.onboardingSkippedAt != null;
  const allSetupComplete = hasLocations && hasSuppliers && hasItems && hasReceivedOrders;
  
  // Show reminder if: onboarding not complete AND not skipped AND setup not complete AND staff+
  const shouldShowReminder = !isOnboardingComplete && !isOnboardingSkipped && !allSetupComplete && canManage;

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
          hasLocations={hasLocations}
          hasSuppliers={hasSuppliers}
          hasItems={hasItems}
          hasReceivedOrders={hasReceivedOrders}
        />
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Draft / Sent Orders KPI */}
        {canManage ? (
          <Link href="/orders" className="group">
            <Card className="h-full transition-all hover:border-sky-300 hover:shadow-md dark:hover:border-sky-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Draft / Sent Orders</h2>
                  <div className="mt-3 flex items-baseline gap-2">
                    <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{draftOrdersCount}</p>
                    <span className="text-lg text-slate-500 dark:text-slate-400">/</span>
                    <p className="text-2xl font-semibold text-slate-700 dark:text-slate-300">{sentOrdersCount}</p>
                  </div>
                  <p className="mt-2 text-xs font-medium text-sky-600 group-hover:text-sky-700 dark:text-sky-400 dark:group-hover:text-sky-300">
                    View all orders →
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 text-slate-400 dark:text-slate-600" />
              </div>
            </Card>
          </Link>
        ) : (
          <Card>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Draft / Sent Orders</h2>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{draftOrdersCount}</p>
                  <span className="text-lg text-slate-500 dark:text-slate-400">/</span>
                  <p className="text-2xl font-semibold text-slate-700 dark:text-slate-300">{sentOrdersCount}</p>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {draftOrdersCount + sentOrdersCount === 0 ? 'No active orders' : 'Active orders'}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-slate-400 dark:text-slate-600" />
            </div>
          </Card>
        )}

        {/* Awaiting Receipt KPI */}
        {canManage ? (
          <Link href={AWAITING_RECEIPT_LINK} className="group">
            <Card className="h-full transition-all hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Awaiting Receipt</h2>
                  <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{awaitingReceiptCount}</p>
                  <p className="mt-2 text-xs font-medium text-blue-600 group-hover:text-blue-700 dark:text-blue-400 dark:group-hover:text-blue-300">
                    {awaitingReceiptCount > 0 ? 'Go to Receiving →' : 'All orders received'}
                  </p>
                </div>
                <Inbox className="h-8 w-8 text-slate-400 dark:text-slate-600" />
              </div>
            </Card>
          </Link>
        ) : (
          <Card>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Awaiting Receipt</h2>
                <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{awaitingReceiptCount}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {awaitingReceiptCount > 0 ? 'Orders in transit' : 'All orders received'}
                </p>
              </div>
              <Inbox className="h-8 w-8 text-slate-400 dark:text-slate-600" />
            </div>
          </Card>
        )}

        {/* Low Stock Items KPI */}
        {canManage ? (
          <Link href="/inventory" className="group">
            <Card className="h-full transition-all hover:border-amber-300 hover:shadow-md dark:hover:border-amber-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Low Stock Items</h2>
                  <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{lowStockCount}</p>
                  <p className="mt-2 text-xs font-medium text-amber-600 group-hover:text-amber-700 dark:text-amber-400 dark:group-hover:text-amber-300">
                    {lowStockCount > 0 ? 'View inventory →' : 'All items stocked'}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-slate-400 dark:text-slate-600" />
              </div>
            </Card>
          </Link>
        ) : (
          <Card>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Low Stock Items</h2>
                <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{lowStockCount}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {lowStockCount > 0 ? 'Items need restocking' : 'All items adequately stocked'}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-slate-400 dark:text-slate-600" />
            </div>
          </Card>
        )}

        {/* Received Orders KPI (non-interactive) */}
        <Card>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Received Orders</h2>
              <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{receivedOrdersCount}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Recently completed</p>
            </div>
            <Package className="h-8 w-8 text-slate-400 dark:text-slate-600" />
          </div>
        </Card>
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
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      Date
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      Supplier
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      Total
                    </th>
                    <th className="px-5 py-3.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {orders.map((order) => {
                    const total = calculateOrderTotal(order.items || []);

                    // Get supplier display name and ID for linking (same logic as Orders list page)
                    const { name: supplierName, linkId: supplierLinkId } = getOrderSupplierDisplay(order);

                    return (
                      <tr key={order.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{formatDistanceToNow(order.createdAt, { addSuffix: true })}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-500">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
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
                        <td className="px-5 py-4">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-slate-900 dark:text-slate-200">
                          {total > 0 ? `€${total.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-5 py-4 text-right">
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Low Stock Items</h2>
          {lowStockInfoWithDetails.length > 0 && (
            <Link
              href="/inventory"
              className="text-sm font-medium text-amber-600 transition hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
            >
              View all →
            </Link>
          )}
        </div>
        {lowStockInfoWithDetails.length > 0 ? (
          <Card className="overflow-hidden p-0">
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {lowStockInfoWithDetails.map(({ item, lowStockLocations, suggestedQuantity }) => {
                // Find the worst location (lowest stock relative to reorder point)
                const worstLocation = lowStockLocations.reduce((worst, curr) => {
                  const currRatio = curr.reorderPoint ? curr.quantity / curr.reorderPoint : 1;
                  const worstRatio = worst.reorderPoint ? worst.quantity / worst.reorderPoint : 1;
                  return currRatio < worstRatio ? curr : worst;
                }, lowStockLocations[0]);

                return (
                  <div key={item.id} className="p-5 transition hover:bg-amber-50/50 dark:hover:bg-amber-900/5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{item.name}</h3>
                          {item.sku && (
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                              {item.sku}
                            </span>
                          )}
                          <span className="shrink-0 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/60 dark:border-amber-700 dark:text-amber-300">
                            Low stock
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                          {item.defaultPracticeSupplier ? (
                            <span>
                              Supplier:{' '}
                              <Link
                                href={`/suppliers#${item.defaultPracticeSupplier.id}`}
                                className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                              >
                                {item.defaultPracticeSupplier.customLabel || item.defaultPracticeSupplier.globalSupplier.name}
                              </Link>
                            </span>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-400">⚠ No default supplier</span>
                          )}
                          {worstLocation && (
                            <span className="font-medium text-amber-800 dark:text-amber-300">
                              {worstLocation.location?.name || 'Unknown'}: {worstLocation.quantity} / {worstLocation.reorderPoint}
                            </span>
                          )}
                          {lowStockLocations.length > 1 && (
                            <span className="text-slate-500 dark:text-slate-500">
                              +{lowStockLocations.length - 1} more location{lowStockLocations.length > 2 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <Link href={buildLowStockOrderHref(item)} className="shrink-0">
                          <Button variant="secondary" size="sm">
                            Order
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card className="p-8">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">All items adequately stocked</h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                No items are currently below their reorder points.
              </p>
            </div>
          </Card>
        )}
      </div>

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

