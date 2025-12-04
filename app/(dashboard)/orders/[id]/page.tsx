import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PracticeRole, OrderStatus } from '@prisma/client';
import { format } from 'date-fns';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getOrderService, getInventoryService } from '@/src/services';
import { hasRole } from '@/lib/rbac';
import { decimalToNumber, calculateOrderTotal } from '@/lib/prisma-transforms';
import { Button } from '@/components/ui/button';

import {
  removeOrderItemAction,
  updateOrderAction,
  deleteOrderAction,
  sendOrderAction,
} from '../actions';
import { EditableOrderItem } from './_components/editable-order-item';
import { AddItemForm } from './_components/add-item-form';
import { OrderActions } from './_components/order-actions';
import { OrderItemsTable } from './_components/order-items-table';

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const { session, practiceId } = await requireActivePractice();
  const ctx = await buildRequestContext();

  // Fetch order using OrderService
  let order;
  try {
    order = await getOrderService().getOrderById(ctx, id);
  } catch (error) {
    notFound();
  }

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  const canEdit = canManage && order.status === OrderStatus.DRAFT;
  const canReceive = canManage && (order.status === OrderStatus.SENT || order.status === OrderStatus.PARTIALLY_RECEIVED || order.status === OrderStatus.PARTIAL_BACKORDER);
  const canClose = canManage && (order.status === OrderStatus.SENT || order.status === OrderStatus.PARTIALLY_RECEIVED || order.status === OrderStatus.PARTIAL_BACKORDER);
  const hasBackorders = order.status === OrderStatus.PARTIAL_BACKORDER;

  // Get all locations for receiving
  const locations = await getInventoryService().getLocations(ctx);

  // Get all items for adding to order (only if can edit)
  const allItemsResult = canEdit
    ? await getInventoryService().findItems(ctx, {}, { limit: 10000 })
    : { items: [], totalCount: 0 };
  const allItems = allItemsResult.items;

  // Filter items that match the order's supplier
  const availableItems = allItems
    .filter((item) => {
      // Check if item is related to this supplier
      const hasSupplierItem = item.practiceSupplierItems?.some((si: any) => si.practiceSupplierId === order.practiceSupplierId);
      const hasDefaultSupplier = item.defaultPracticeSupplierId === order.practiceSupplierId;
      return hasSupplierItem || hasDefaultSupplier;
    })
    .filter((item) => !(order.items || []).some((oi: any) => oi.itemId === item.id))
    .map((item) => ({
      ...item,
      practiceSupplierItems: (item.practiceSupplierItems || []).map((si: any) => ({
        practiceSupplierId: si.practiceSupplierId,
        unitPrice: decimalToNumber(si.unitPrice),
      })),
    }));

  const total = calculateOrderTotal(order.items || []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ← Back to Orders
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Order Details</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {order.reference ? `Reference: ${order.reference}` : `Order #${order.id.slice(0, 8)}`}
          </p>
        </div>
        <div className="flex gap-3">
          <OrderActions 
            orderId={order.id} 
            canEdit={canEdit} 
            canReceive={canReceive}
            canClose={canClose}
          />
          {canReceive ? (
            <Link href={`/receiving/new?orderId=${order.id}`}>
              <Button variant="primary" size="md" className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700">
                Receive This Order
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {/* Backorder Info Banner */}
      {hasBackorders && (
        <div className="rounded-lg border border-violet-300 bg-violet-50 p-4 dark:border-violet-700 dark:bg-violet-900/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 rounded-full bg-violet-100 p-2 dark:bg-violet-800/50">
              <svg className="h-5 w-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-violet-900 dark:text-violet-100">
                Items on Backorder
              </h3>
              <p className="mt-1 text-sm text-violet-700 dark:text-violet-300">
                This order has items marked as backorder, meaning they are expected in a future shipment.
                You can continue to receive additional shipments when they arrive.
              </p>
              <p className="mt-2 text-xs text-violet-600 dark:text-violet-400 italic">
                Backorder tracking and automatic fulfillment monitoring coming soon.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Order Info */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Order Information</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600 dark:text-slate-400">Status</dt>
              <dd>
                <StatusBadge status={order.status} />
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-slate-600 dark:text-slate-400">Supplier</dt>
              <dd className="text-slate-900 dark:text-slate-200">
                {order.practiceSupplier ? (
                  <>
                    <Link
                      href={`/suppliers#${order.practiceSupplier.id}`}
                      className="text-sky-400 hover:text-sky-300"
                    >
                      {order.practiceSupplier.customLabel || order.practiceSupplier.globalSupplier.name}
                    </Link>
                    {order.practiceSupplier.accountNumber && (
                      <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                        (Account: {order.practiceSupplier.accountNumber})
                      </span>
                    )}
                    {order.practiceSupplier.isPreferred && (
                      <span className="ml-2 text-xs">⭐</span>
                    )}
                    {order.practiceSupplier.orderingNotes && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 italic">
                        {order.practiceSupplier.orderingNotes}
                      </p>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">Unknown Supplier</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600 dark:text-slate-400">Created</dt>
              <dd className="text-slate-900 dark:text-slate-200">
                {format(order.createdAt, 'MMM d, yyyy h:mm a')}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600 dark:text-slate-400">Created By</dt>
              <dd className="text-slate-900 dark:text-slate-200">
                {order.createdBy?.name || order.createdBy?.email || 'Unknown'}
              </dd>
            </div>
            {order.sentAt ? (
              <div className="flex justify-between">
                <dt className="text-slate-600 dark:text-slate-400">Sent</dt>
                <dd className="text-slate-900 dark:text-slate-200">
                  {format(order.sentAt, 'MMM d, yyyy h:mm a')}
                </dd>
              </div>
            ) : null}
            {order.expectedAt ? (
              <div className="flex justify-between">
                <dt className="text-slate-600 dark:text-slate-400">Expected</dt>
                <dd className="text-slate-900 dark:text-slate-200">
                  {format(order.expectedAt, 'MMM d, yyyy')}
                </dd>
              </div>
            ) : null}
            {order.receivedAt ? (
              <div className="flex justify-between">
                <dt className="text-slate-600 dark:text-slate-400">Received</dt>
                <dd className="text-slate-900 dark:text-slate-200">
                  {format(order.receivedAt, 'MMM d, yyyy h:mm a')}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        {/* Notes and Reference */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Notes & Reference</h2>
          {canEdit ? (
            <form action={async (formData: FormData) => {
              'use server';
              await updateOrderAction(formData);
            }} className="space-y-4">
              <input type="hidden" name="orderId" value={order.id} />
              <div className="space-y-2">
                <label htmlFor="reference" className="text-sm text-slate-700 dark:text-slate-400">
                  Reference Number
                </label>
                <input
                  id="reference"
                  name="reference"
                  defaultValue={order.reference ?? ''}
                  placeholder="PO-12345"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm text-slate-700 dark:text-slate-400">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  defaultValue={order.notes ?? ''}
                  placeholder="Add any notes about this order..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Save Changes
              </button>
            </form>
          ) : (
            <div className="space-y-3 text-sm">
              {order.reference ? (
                <div>
                  <dt className="text-slate-600 dark:text-slate-400">Reference</dt>
                  <dd className="mt-1 text-slate-900 dark:text-slate-200">{order.reference}</dd>
                </div>
              ) : null}
              {order.notes ? (
                <div>
                  <dt className="text-slate-600 dark:text-slate-400">Notes</dt>
                  <dd className="mt-1 text-slate-900 dark:text-slate-200 whitespace-pre-wrap">{order.notes}</dd>
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-500">No notes or reference added.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Order Items</h2>
        </div>

        {(order.items?.length || 0) === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600 dark:text-slate-400">
            <p className="font-medium text-slate-900 dark:text-slate-200">No items in this order</p>
            <p className="mt-2">
              {canEdit ? 'Add items using the form below.' : 'This order has no items yet.'}
            </p>
          </div>
        ) : canEdit ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                    Item
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {order.items?.map((orderItem: any) => {
                  const unitPrice = decimalToNumber(orderItem.unitPrice) || 0;

                  return (
                    <EditableOrderItem
                      key={orderItem.id}
                      orderId={order.id}
                      itemId={orderItem.itemId}
                      quantity={orderItem.quantity}
                      unitPrice={unitPrice}
                      itemName={orderItem.item?.name || ''}
                      itemSku={orderItem.item?.sku}
                      itemUnit={orderItem.item?.unit}
                    />
                  );
                })}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <td 
                    colSpan={3} 
                    className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-200"
                  >
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-slate-900 dark:text-white">
                    {total > 0 ? `€${total.toFixed(2)}` : '-'}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <OrderItemsTable
            items={(order.items || []).map((orderItem: any) => ({
              id: orderItem.id,
              itemId: orderItem.itemId,
              quantity: orderItem.quantity,
              unitPrice: decimalToNumber(orderItem.unitPrice) || 0,
              item: orderItem.item ? {
                name: orderItem.item.name,
                sku: orderItem.item.sku,
                unit: orderItem.item.unit,
                productId: orderItem.item.productId,
              } : null,
            }))}
            total={total}
          />
        )}

        {/* Add Item Form - Always visible for draft orders */}
        {canEdit ? (
          <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <AddItemForm 
              orderId={order.id} 
              practiceSupplierId={order.practiceSupplierId}
              items={availableItems} 
            />
          </div>
        ) : null}
      </div>

    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    [OrderStatus.DRAFT]: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    [OrderStatus.SENT]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    [OrderStatus.PARTIALLY_RECEIVED]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    [OrderStatus.PARTIAL_BACKORDER]: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
    [OrderStatus.RECEIVED]: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    [OrderStatus.CANCELLED]: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  };

  const labels: Record<OrderStatus, string> = {
    [OrderStatus.DRAFT]: 'Draft',
    [OrderStatus.SENT]: 'Sent',
    [OrderStatus.PARTIALLY_RECEIVED]: 'Partially Received',
    [OrderStatus.PARTIAL_BACKORDER]: 'Backorder Pending',
    [OrderStatus.RECEIVED]: 'Received',
    [OrderStatus.CANCELLED]: 'Cancelled',
  };

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

