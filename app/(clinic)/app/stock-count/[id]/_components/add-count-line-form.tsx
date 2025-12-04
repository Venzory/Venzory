'use client';

import { useActionState } from 'react';
import { useEffect, useState, useRef } from 'react';
import { addCountLineAction } from '../../actions';
import { Info } from 'lucide-react';

interface AddCountLineFormProps {
  sessionId: string;
  locationId: string;
  items: Array<{
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
  }>;
  selectedItemId: string | null;
  initialCount?: number | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddCountLineForm({
  sessionId,
  locationId,
  items,
  selectedItemId,
  initialCount,
  onSuccess,
  onCancel,
}: AddCountLineFormProps) {
  const [state, formAction] = useActionState(addCountLineAction, null);
  const [systemQty, setSystemQty] = useState<number | null>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = initialCount !== undefined && initialCount !== null;

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state, onSuccess]);

  // Auto-focus quantity input when item is selected or in edit mode
  useEffect(() => {
    if (selectedItemId && quantityInputRef.current) {
      quantityInputRef.current.focus();
      quantityInputRef.current.select();
    }
  }, [selectedItemId]);

  // Show system quantity when item is selected
  const handleItemChange = async (itemId: string) => {
    if (!itemId) {
      setSystemQty(null);
      return;
    }

    try {
      // Fetch system quantity for this item at this location
      const response = await fetch(`/api/inventory/${locationId}/${itemId}`);
      if (response.ok) {
        const data = await response.json();
        setSystemQty(data.quantity || 0);
      }
    } catch (error) {
      console.error('Failed to fetch system quantity:', error);
    }
  };

  // Trigger system qty fetch on mount if item selected
  useEffect(() => {
    if (selectedItemId) {
      handleItemChange(selectedItemId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId, locationId]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="sessionId" value={sessionId} />

      {state?.error && (
        <div className="rounded-lg border border-rose-800 bg-rose-900/30 p-4">
          <p className="text-sm text-rose-300">{state.error}</p>
        </div>
      )}

      {state && 'variance' in state && state.variance !== undefined && (
        <div className="rounded-lg border border-sky-800 bg-sky-900/30 p-4">
          <p className="text-sm text-sky-300">
            Variance: {state.variance > 0 ? '+' : ''}
            {state.variance}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {isEditMode ? 'Update Count' : 'Count Item'}
        </h3>
        {isEditMode && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
            <Info className="h-3.5 w-3.5" />
            Updating existing line
          </span>
        )}
      </div>

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
          onChange={(e) => handleItemChange(e.target.value)}
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

      {/* System Quantity Display */}
      {systemQty !== null && (
        <div className="rounded-lg bg-slate-900/40 border border-slate-800 p-4">
          <p className="text-sm text-slate-400">System Quantity</p>
          <p className="text-2xl font-bold text-slate-100">{systemQty}</p>
        </div>
      )}

      {/* Counted Quantity */}
      <div className="space-y-2">
        <label
          htmlFor="countedQuantity"
          className="block text-sm font-medium text-slate-900 dark:text-slate-200"
        >
          Counted Quantity *
        </label>
        <input
          ref={quantityInputRef}
          type="number"
          id="countedQuantity"
          name="countedQuantity"
          required
          min="0"
          defaultValue={initialCount ?? 0}
          className="w-32 rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
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
          {isEditMode ? 'Update Count' : 'Add Count'}
        </button>
      </div>
    </form>
  );
}
