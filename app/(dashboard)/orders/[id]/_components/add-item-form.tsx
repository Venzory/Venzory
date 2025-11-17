'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from '@/lib/toast';
import { Input } from '@/components/ui/input';
import { addOrderItemAction } from '../../actions';
import { ItemSelector, type ItemForSelection } from '../../_components/item-selector';
import type { FormState } from '@/lib/form-types';

const initialState: FormState = {};

interface AddItemFormProps {
  orderId: string;
  practiceSupplierId: string;
  items: Array<{
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
    defaultSupplierId: string | null;
    defaultPracticeSupplierId?: string | null;
    supplierItems?: Array<{
      supplierId: string;
      practiceSupplierId?: string | null;
      unitPrice: number | null;
    }>;
  }>;
}

export function AddItemForm({ orderId, practiceSupplierId, items }: AddItemFormProps) {
  const [state, formAction] = useActionState(addOrderItemAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const itemSelectorKeyRef = useRef(0);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      // Reset form after successful addition
      formRef.current?.reset();
      // Force ItemSelector to reset by changing its key
      itemSelectorKeyRef.current += 1;
    } else if (state.error) {
      toast.error(state.error);
    }
    // Don't toast field errors - they're shown inline
  }, [state]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        Add Item to Order
      </h3>

      {state.error && (
        <div className="rounded-lg border border-rose-700 bg-rose-900/20 p-3 text-sm text-rose-300">
          {state.error}
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-3">
        <input type="hidden" name="orderId" value={orderId} />
        
        <div className="grid gap-3 sm:grid-cols-12">
          {/* Item Selector */}
          <div className="sm:col-span-6 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-400">
              Select Item *
            </label>
            <ItemSelector
              key={itemSelectorKeyRef.current}
              items={items as ItemForSelection[]}
              practiceSupplierId={practiceSupplierId}
              onSelect={(itemId) => {
                // Update hidden input with selected item ID
                const hiddenInput = formRef.current?.querySelector('input[name="itemId"]') as HTMLInputElement;
                if (hiddenInput) {
                  hiddenInput.value = itemId;
                }
              }}
              excludeItemIds={[]}
              placeholder="Search items by name or SKU..."
            />
            <input type="hidden" name="itemId" />
            {state.errors?.itemId?.[0] && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{state.errors.itemId[0]}</p>
            )}
          </div>

          {/* Quantity */}
          <div className="sm:col-span-3">
            <Input
              label="Quantity"
              name="quantity"
              type="number"
              min="1"
              defaultValue="1"
              required
              error={state.errors?.quantity?.[0]}
            />
          </div>

          {/* Unit Price */}
          <div className="sm:col-span-3 space-y-1">
            <label htmlFor="unitPrice" className="text-xs font-medium text-slate-700 dark:text-slate-400">
              Unit Price (€)
            </label>
            <input
              id="unitPrice"
              name="unitPrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue="0"
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add Item
          </button>
        </div>
      </form>
    </div>
  );
}
