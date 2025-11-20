'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { FormState } from '@/lib/form-types';

import { createStockAdjustmentAction } from '../actions';

const initialState: FormState = {};

type ItemOption = {
  id: string;
  name: string;
  sku: string | null;
};

type LocationOption = {
  id: string;
  name: string;
  code: string | null;
};

export function StockAdjustmentForm({
  items = [],
  locations = [],
}: {
  items: ItemOption[];
  locations: LocationOption[];
}) {
  const [state, formAction] = useActionState(createStockAdjustmentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      // Reset form after successful adjustment
      formRef.current?.reset();
    } else if (state.error) {
      // Show domain/server errors as toasts
      toast.error(state.error);
    }
    // Don't toast field errors - they're shown inline
  }, [state]);

  return (
    <form 
      ref={formRef}
      action={formAction} 
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none"
    >
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Record stock adjustment</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Adjust on-hand quantity for a specific item and location.</p>
      </div>

      {state.error && (
        <div className="rounded-lg bg-rose-900/20 border border-rose-800 p-4">
          <p className="text-sm text-rose-300">{state.error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Select
              label="Item"
              id="adjust-item"
              name="itemId"
              required
              error={state.errors?.itemId?.[0]}
            >
              <option value="">Select item…</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.sku ? ` (${item.sku})` : ''}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Select
              label="Location"
              id="adjust-location"
              name="locationId"
              required
              error={state.errors?.locationId?.[0]}
            >
              <option value="">Select location…</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                  {location.code ? ` (${location.code})` : ''}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Input
              label="Quantity change"
              name="quantity"
              type="number"
              required
              placeholder="e.g. 5 or -5"
              error={state.errors?.quantity?.[0]}
            />
          </div>
          <div>
            <Input
              label="Reason"
              id="adjust-reason"
              name="reason"
              placeholder="e.g. intake, waste"
            />
          </div>
        </div>

        <div>
          <Textarea
            label="Note"
            id="adjust-note"
            name="note"
            rows={3}
            placeholder="Optional context"
          />
        </div>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Save adjustment
      </button>
    </form>
  );
}


