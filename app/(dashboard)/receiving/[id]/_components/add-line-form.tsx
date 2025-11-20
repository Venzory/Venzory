'use client';

import { useActionState } from 'react';
import { useEffect, useState } from 'react';
import { addReceiptLineAction } from '../../actions';
import { Info } from 'lucide-react';

interface ExpectedItem {
  itemId: string;
  itemName: string;
  itemSku: string | null;
  orderedQuantity: number;
  alreadyReceived: number;
  remainingQuantity: number;
  unit: string | null;
}

interface AddLineFormProps {
  receiptId: string;
  items: Array<{
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
  }>;
  selectedItemId: string | null;
  expectedItems?: ExpectedItem[] | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddLineForm({
  receiptId,
  items,
  selectedItemId,
  expectedItems,
  onSuccess,
  onCancel,
}: AddLineFormProps) {
  const [state, formAction] = useActionState(addReceiptLineAction, null);
  const [currentSelection, setCurrentSelection] = useState(selectedItemId || '');

  const matchedOrder = expectedItems?.find((i) => i.itemId === currentSelection);

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
          onChange={(e) => setCurrentSelection(e.target.value)}
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
        
        {matchedOrder && (
          <div className="mt-2 flex items-start gap-3 rounded-md bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-900/20 dark:text-sky-200 border border-sky-100 dark:border-sky-800">
            <Info className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />
            <div>
              <p className="font-medium">Item is part of linked order</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sky-800 dark:text-sky-300">
                <span>Ordered: {matchedOrder.orderedQuantity}</span>
                <span>Received: {matchedOrder.alreadyReceived}</span>
                <span className="font-semibold text-sky-700 dark:text-sky-200">
                  Remaining: {matchedOrder.remainingQuantity}
                </span>
              </div>
            </div>
          </div>
        )}
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
          defaultValue={matchedOrder ? matchedOrder.remainingQuantity : 1}
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

