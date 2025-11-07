import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { PracticeRole, OrderStatus } from '@prisma/client';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/rbac';

export default async function OrdersPage() {
  const { session, practiceId } = await requireActivePractice();

  const orders = await prisma.order.findMany({
    where: { practiceId },
    include: {
      supplier: {
        select: { id: true, name: true },
      },
      items: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
        },
      },
      createdBy: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const canManage = hasRole({
    memberships: session.user.memberships,
    practiceId,
    minimumRole: PracticeRole.STAFF,
  });

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
          <Link
            href="/orders/templates"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            Order Templates
          </Link>
          {canManage ? (
            <Link
              href="/orders/new"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            >
              New Order
            </Link>
          ) : null}
        </div>
      </div>

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
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
        <p className="text-base font-semibold text-slate-900 dark:text-slate-200">No orders yet</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {canManage
            ? 'Create your first purchase order to start tracking inventory deliveries.'
            : 'Orders will appear here once created by staff members.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
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
              const itemCount = order.items.length;
              const total = order.items.reduce((sum: number, item: any) => {
                const price = item.unitPrice ? parseFloat(item.unitPrice.toString()) : 0;
                return sum + price * item.quantity;
              }, 0);

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
                    <Link
                      href={`/suppliers#${order.supplier.id}`}
                      className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                    >
                      {order.supplier.name}
                    </Link>
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
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const styles = {
    [OrderStatus.DRAFT]: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600',
    [OrderStatus.SENT]: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    [OrderStatus.RECEIVED]: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    [OrderStatus.CANCELLED]: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700',
  };

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}
