'use client';

import { useState } from 'react';
import { ReceiveOrderForm } from './receive-order-form';

interface OrderItemWithReceipts {
  id: string;
  itemId: string;
  quantity: number;
  item: {
    name: string;
    sku: string | null;
    unit: string | null;
  };
  receipts: {
    receivedQuantity: number;
  }[];
}

interface ReceiveOrderButtonProps {
  orderId: string;
  orderItems: OrderItemWithReceipts[];
  locations: { id: string; name: string }[];
}

export function ReceiveOrderButton({
  orderId,
  orderItems,
  locations,
}: ReceiveOrderButtonProps) {
  const [showForm, setShowForm] = useState(false);

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
      >
        Receive Order
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Receive Order</h2>
        <ReceiveOrderForm
          orderId={orderId}
          orderItems={orderItems}
          locations={locations}
          onCancel={() => setShowForm(false)}
        />
      </div>
    </div>
  );
}

