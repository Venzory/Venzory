'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

interface Order {
  id: string;
  reference: string | null;
  createdAt: Date;
  practiceSupplier?: {
    customLabel?: string | null;
    globalSupplier: {
      name: string;
    };
  } | null;
  items?: { id: string }[];
}

interface OrderSelectionListProps {
  orders: Order[];
  isAdmin: boolean;
}

export function OrderSelectionList({ orders, isAdmin }: OrderSelectionListProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleOrderSelect = (orderId: string) => {
    setIsNavigating(true);
    router.push(`/receiving/new?orderId=${orderId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Receive Goods
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Select an open order to start receiving
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/receiving/new?noPo=true"
            className="text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400"
          >
            No-PO Receiving (Admin) →
          </Link>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <p className="text-slate-500 dark:text-slate-400">
            No open orders found ready for receiving.
          </p>
          <div className="mt-4">
            <Link
              href="/orders/new"
              className="text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              Create a New Order
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => {
            const supplierName = 
              order.practiceSupplier?.customLabel || 
              order.practiceSupplier?.globalSupplier.name || 
              'Unknown Supplier';
            
            return (
              <button
                key={order.id}
                onClick={() => handleOrderSelect(order.id)}
                disabled={isNavigating}
                className="group relative flex flex-col items-start rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-sky-500 hover:shadow-sm disabled:cursor-wait disabled:opacity-70 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-500"
              >
                <div className="mb-2 flex w-full items-center justify-between">
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {order.reference || `#${order.id.slice(0, 8)}`}
                  </span>
                  <span className="text-xs text-slate-400">
                    {format(new Date(order.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
                
                <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                  {supplierName}
                </h3>
                
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {order.items?.length || 0} expected items
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

