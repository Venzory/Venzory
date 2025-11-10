'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { createGoodsReceiptAction } from '../../actions';

interface OrderContext {
  id: string;
  reference: string | null;
  supplierId: string;
  supplierName: string;
  items: Array<{
    id: string;
    itemId: string;
    itemName: string;
    itemSku: string | null;
    quantity: number;
  }>;
}

interface NewReceiptFormProps {
  locations: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  order?: OrderContext;
}

export function NewReceiptForm({ locations, suppliers, order }: NewReceiptFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(createGoodsReceiptAction, null);

  useEffect(() => {
    if (state && 'receiptId' in state && state.receiptId) {
      router.push(`/receiving/${state.receiptId}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6 rounded-lg border border-card-border bg-card p-6">
      {state?.error && (
        <div className="rounded-lg border border-rose-800 bg-rose-900/30 p-4">
          <p className="text-sm text-rose-300">{state.error}</p>
        </div>
      )}

      {/* Hidden Order ID field if linked to order */}
      {order && <input type="hidden" name="orderId" value={order.id} />}

      {/* Order Info Banner */}
      {order && (
        <div className="rounded-lg border border-sky-800 bg-sky-900/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-sky-300">
                Linked to Order {order.reference || `#${order.id.slice(0, 8)}`}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Expected items: {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Location */}
      <div className="space-y-2">
        <label htmlFor="locationId" className="block text-sm font-medium text-slate-900 dark:text-slate-200">
          Receiving Location *
        </label>
        <select
          id="locationId"
          name="locationId"
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          style={{ minHeight: '48px' }}
        >
          <option value="">Select a location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
        {locations.length === 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            No locations found. Please create a location first.
          </p>
        )}
      </div>

      {/* Supplier (Optional or pre-filled from order) */}
      <div className="space-y-2">
        <label htmlFor="supplierId" className="block text-sm font-medium text-slate-900 dark:text-slate-200">
          Supplier {order ? '' : '(Optional)'}
        </label>
        <select
          id="supplierId"
          name="supplierId"
          defaultValue={order?.supplierId || ''}
          disabled={!!order}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ minHeight: '48px' }}
        >
          <option value="">No supplier</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
        {order && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Supplier is pre-filled from the order
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label htmlFor="notes" className="block text-sm font-medium text-slate-900 dark:text-slate-200">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={512}
          defaultValue={order ? `Receiving order ${order.reference || `#${order.id.slice(0, 8)}`}` : ''}
          placeholder="Add any notes about this receipt..."
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full sm:w-auto rounded-lg border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
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
          Start Receiving
        </button>
      </div>
    </form>
  );
}

