import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PracticeRole, OrderStatus } from '@prisma/client';
import { format } from 'date-fns';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/rbac';

import {
  removeOrderItemAction,
  updateOrderAction,
  deleteOrderAction,
  addOrderItemInlineAction,
  sendOrderAction,
} from '../actions';
import { EditableOrderItem } from './_components/editable-order-item';
import { AddItemForm } from './_components/add-item-form';

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const { session, practiceId } = await requireActivePractice();

  const order = await prisma.order.findUnique({
    where: { id, practiceId },
    include: {
      supplier: true,
      items: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
            },
          },
        },
        orderBy: { item: { name: 'asc' } },
      },
      createdBy: {
        select: { name: true, email: true },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

  const canEdit = canManage && order.status === OrderStatus.DRAFT;
  const canReceive = canManage && order.status === OrderStatus.SENT;

  // Get all locations for receiving
  const locations = await prisma.location.findMany({
    where: { practiceId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  // Get all items for adding to order
  const allItems = canEdit
    ? await prisma.item.findMany({
        where: { practiceId },
        orderBy: { name: 'asc' },
        include: {
          supplierItems: {
            where: { supplierId: order.supplierId },
            select: { unitPrice: true },
          },
        },
      })
    : [];

  // Filter out items already in the order and convert Decimal to plain number
  const availableItems = allItems
    .filter((item) => !order.items.some((oi) => oi.itemId === item.id))
    .map((item) => ({
      ...item,
      supplierItems: item.supplierItems.map((si) => ({
        unitPrice: si.unitPrice ? parseFloat(si.unitPrice.toString()) : null,
      })),
    }));

  const total = order.items.reduce((sum, item) => {
    const price = item.unitPrice ? parseFloat(item.unitPrice.toString()) : 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="text-sm text-slate-400 transition hover:text-slate-200"
            >
              ← Back to Orders
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-white">Order Details</h1>
          <p className="text-sm text-slate-300">
            {order.reference ? `Reference: ${order.reference}` : `Order #${order.id.slice(0, 8)}`}
          </p>
        </div>
        <div className="flex gap-3">
          {canEdit ? (
            <>
              <form action={sendOrderAction.bind(null, order.id)}>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  Send to Supplier
                </button>
              </form>
              <form action={deleteOrderAction.bind(null, order.id)}>
                <button
                  type="submit"
                  className="rounded-lg border border-rose-700 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-900/20"
                >
                  Delete Order
                </button>
              </form>
            </>
          ) : null}
          {canReceive ? (
            <Link
              href={`/receiving/new?orderId=${order.id}`}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              Receive This Order
            </Link>
          ) : null}
        </div>
      </div>

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
            <div className="flex justify-between">
              <dt className="text-slate-600 dark:text-slate-400">Supplier</dt>
              <dd className="text-slate-900 dark:text-slate-200">
                <Link
                  href={`/suppliers#${order.supplier.id}`}
                  className="text-sky-400 hover:text-sky-300"
                >
                  {order.supplier.name}
                </Link>
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
            <form action={updateOrderAction} className="space-y-4">
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

        {order.items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600 dark:text-slate-400">
            <p className="font-medium text-slate-200">No items in this order</p>
            <p className="mt-2">
              {canEdit ? 'Add items using the form below.' : 'This order has no items yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Item
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Total
                  </th>
                  {canEdit ? (
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Actions
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {order.items.map((orderItem) => {
                  const unitPrice = orderItem.unitPrice
                    ? parseFloat(orderItem.unitPrice.toString())
                    : 0;
                  const lineTotal = unitPrice * orderItem.quantity;

                  if (canEdit) {
                    return (
                      <EditableOrderItem
                        key={orderItem.id}
                        orderId={order.id}
                        itemId={orderItem.itemId}
                        quantity={orderItem.quantity}
                        unitPrice={unitPrice}
                        itemName={orderItem.item.name}
                        itemSku={orderItem.item.sku}
                        itemUnit={orderItem.item.unit}
                      />
                    );
                  }

                  return (
                    <tr key={orderItem.id}>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-200">
                            {orderItem.item.name}
                          </span>
                          {orderItem.item.sku ? (
                            <span className="text-xs text-slate-500">{orderItem.item.sku}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-slate-200">
                          {orderItem.quantity} {orderItem.item.unit || 'units'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-slate-200">
                          {unitPrice > 0 ? `€${unitPrice.toFixed(2)}` : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-200">
                        {lineTotal > 0 ? `€${lineTotal.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-slate-800 bg-slate-950/40">
                <tr>
                  <td 
                    colSpan={canEdit ? 3 : 3} 
                    className="px-4 py-3 text-right font-semibold text-slate-200"
                  >
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-white">
                    {total > 0 ? `€${total.toFixed(2)}` : '-'}
                  </td>
                  {canEdit ? <td></td> : null}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Add Item Form */}
        {canEdit && availableItems.length > 0 ? (
          <div className="border-t border-slate-800 bg-slate-950/40 p-4">
            <AddItemForm orderId={order.id} items={availableItems} />
          </div>
        ) : null}
      </div>

    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const styles = {
    [OrderStatus.DRAFT]: 'bg-slate-700 text-slate-200',
    [OrderStatus.SENT]: 'bg-blue-900/50 text-blue-300',
    [OrderStatus.RECEIVED]: 'bg-green-900/50 text-green-300',
    [OrderStatus.CANCELLED]: 'bg-rose-900/50 text-rose-300',
  };

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

