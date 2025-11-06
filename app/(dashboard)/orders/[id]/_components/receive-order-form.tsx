'use client';

import { useFormState } from 'react-dom';
import { useState } from 'react';
import { format } from 'date-fns';

import { receiveOrderAction } from '../../actions';

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

interface ReceiveOrderFormProps {
  orderId: string;
  orderItems: OrderItemWithReceipts[];
  locations: { id: string; name: string }[];
  onCancel: () => void;
}

export function ReceiveOrderForm({
  orderId,
  orderItems,
  locations,
  onCancel,
}: ReceiveOrderFormProps) {
  const [state, formAction] = useFormState(receiveOrderAction, null);
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id || '');

  // Initialize form data for each item
  const [itemsData, setItemsData] = useState(() =>
    orderItems.map((orderItem) => {
      const totalReceived = orderItem.receipts.reduce(
        (sum, r) => sum + r.receivedQuantity,
        0
      );
      const remaining = orderItem.quantity - totalReceived;

      return {
        orderItemId: orderItem.id,
        receivedQuantity: remaining,
        batchNumber: '',
        expiryDate: '',
      };
    })
  );

  const updateItemData = (index: number, field: string, value: string | number) => {
    setItemsData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = (formData: FormData) => {
    // Add items as JSON
    formData.append('items', JSON.stringify(itemsData));
    formAction(formData);
  };

  if (state?.success) {
    return (
      <div className="rounded-lg bg-green-900/20 border border-green-800 p-6 text-center">
        <p className="text-lg font-semibold text-green-300">{state.success}</p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <input type="hidden" name="orderId" value={orderId} />

      {state?.error && (
        <div className="rounded-lg bg-rose-900/20 border border-rose-800 p-4">
          <p className="text-sm text-rose-300">{state.error}</p>
        </div>
      )}

      {/* Location Selection */}
      <div className="space-y-2">
        <label htmlFor="locationId" className="block text-sm font-medium text-slate-200">
          Receiving Location *
        </label>
        <select
          id="locationId"
          name="locationId"
          required
          value={selectedLocationId}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-base text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          style={{ minHeight: '48px' }}
        >
          {locations.length === 0 ? (
            <option value="">No locations available</option>
          ) : (
            locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Items to Receive */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Items to Receive</h3>

        {orderItems.map((orderItem, index) => {
          const totalReceived = orderItem.receipts.reduce(
            (sum, r) => sum + r.receivedQuantity,
            0
          );
          const remaining = orderItem.quantity - totalReceived;

          return (
            <div
              key={orderItem.id}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3"
            >
              {/* Item Info */}
              <div className="border-b border-slate-800 pb-3">
                <h4 className="font-medium text-slate-200">{orderItem.item.name}</h4>
                {orderItem.item.sku && (
                  <p className="text-xs text-slate-500">SKU: {orderItem.item.sku}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <span className="text-slate-400">
                    Ordered: <span className="font-medium text-slate-200">{orderItem.quantity}</span>
                  </span>
                  <span className="text-slate-400">
                    Received: <span className="font-medium text-slate-200">{totalReceived}</span>
                  </span>
                  <span className="text-slate-400">
                    Remaining:{' '}
                    <span className="font-medium text-sky-300">{remaining}</span>
                  </span>
                </div>
              </div>

              {/* Received Quantity */}
              <div className="space-y-2">
                <label
                  htmlFor={`quantity-${index}`}
                  className="block text-sm font-medium text-slate-200"
                >
                  Receiving Now *
                </label>
                <input
                  id={`quantity-${index}`}
                  type="number"
                  min="0"
                  max={remaining}
                  value={itemsData[index].receivedQuantity}
                  onChange={(e) =>
                    updateItemData(index, 'receivedQuantity', parseInt(e.target.value) || 0)
                  }
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-base text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  style={{ minHeight: '48px' }}
                />
              </div>

              {/* Batch Number */}
              <div className="space-y-2">
                <label
                  htmlFor={`batch-${index}`}
                  className="block text-sm font-medium text-slate-200"
                >
                  Batch / Lot Number
                </label>
                <input
                  id={`batch-${index}`}
                  type="text"
                  maxLength={128}
                  value={itemsData[index].batchNumber}
                  onChange={(e) => updateItemData(index, 'batchNumber', e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-base text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  style={{ minHeight: '48px' }}
                />
              </div>

              {/* Expiry Date */}
              <div className="space-y-2">
                <label
                  htmlFor={`expiry-${index}`}
                  className="block text-sm font-medium text-slate-200"
                >
                  Expiry Date (THT)
                </label>
                <input
                  id={`expiry-${index}`}
                  type="date"
                  value={itemsData[index].expiryDate}
                  onChange={(e) => updateItemData(index, 'expiryDate', e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-base text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  style={{ minHeight: '48px' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto rounded-lg border border-slate-700 px-6 py-3 text-base font-semibold text-slate-200 transition hover:bg-slate-800"
          style={{ minHeight: '48px' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={locations.length === 0}
          className="w-full sm:w-auto rounded-lg bg-sky-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: '48px' }}
        >
          Confirm Receipt
        </button>
      </div>
    </form>
  );
}

