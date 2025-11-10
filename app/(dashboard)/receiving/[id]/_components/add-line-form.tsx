'use client';

import { useActionState } from 'react';
import { useEffect } from 'react';
import { addReceiptLineAction } from '../../actions';

interface AddLineFormProps {
  receiptId: string;
  items: Array<{
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
  }>;
  selectedItemId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddLineForm({
  receiptId,
  items,
  selectedItemId,
  onSuccess,
  onCancel,
}: AddLineFormProps) {
  const [state, formAction] = useActionState(addReceiptLineAction, null);

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="receiptId" value={receiptId} />

      {state?.error && (
        <div className="rounded-lg bg-rose-900/20 border border-rose-800 p-4">
          <p className="text-sm text-rose-300">{state.error}</p>
        </div>
      )}

      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Item</h3>

      {/* Item Selection */}
      <div className="space-y-2">
        <label htmlFor="itemId" className="block text-sm font-medium text-slate-900 dark:text-slate-200">
          Item *
        </label>
        <select
          id="itemId"
          name="itemId"
          required
          defaultValue={selectedItemId || ''}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          style={{ minHeight: '48px' }}
        >
          <option value="">Select an item</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} {item.sku ? `(${item.sku})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Quantity */}
      <div className="space-y-2">
        <label htmlFor="quantity" className="block text-sm font-medium text-slate-900 dark:text-slate-200">
          Quantity *
        </label>
        <input
          type="number"
          id="quantity"
          name="quantity"
          required
          min="1"
          defaultValue="1"
          className="w-32 rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          style={{ minHeight: '48px' }}
        />
      </div>

      {/* Batch Number */}
      <div className="space-y-2">
        <label htmlFor="batchNumber" className="block text-sm font-medium text-slate-900 dark:text-slate-200">
          Batch / Lot Number
        </label>
        <input
          type="text"
          id="batchNumber"
          name="batchNumber"
          maxLength={128}
          placeholder="Optional"
          className="max-w-xs rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          style={{ minHeight: '48px' }}
        />
      </div>

      {/* Expiry Date */}
      <div className="space-y-2">
        <label htmlFor="expiryDate" className="block text-sm font-medium text-slate-900 dark:text-slate-200">
          Expiry Date (THT)
        </label>
        <input
          type="date"
          id="expiryDate"
          name="expiryDate"
          className="w-40 rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          style={{ minHeight: '48px' }}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label htmlFor="notes" className="block text-sm font-medium text-slate-900 dark:text-slate-200">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={256}
          placeholder="Optional"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto rounded-lg border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          style={{ minHeight: '48px' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="w-full sm:w-auto rounded-lg bg-sky-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-sky-700"
          style={{ minHeight: '48px' }}
        >
          Add Item
        </button>
      </div>
    </form>
  );
}

