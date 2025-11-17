'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
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
          <div className="space-y-2">
            <label htmlFor="adjust-item" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Item <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <select
              id="adjust-item"
              name="itemId"
              required
              className={cn(
                "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:text-slate-100",
                state.errors?.itemId
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/30 dark:border-rose-500"
                  : "border-slate-300 focus:border-sky-500 focus:ring-sky-500/30 dark:border-slate-800"
              )}
            >
              <option value="">Select item…</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.sku ? ` (${item.sku})` : ''}
                </option>
              ))}
            </select>
            {state.errors?.itemId?.[0] && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{state.errors.itemId[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="adjust-location" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Location <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <select
              id="adjust-location"
              name="locationId"
              required
              className={cn(
                "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:text-slate-100",
                state.errors?.locationId
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/30 dark:border-rose-500"
                  : "border-slate-300 focus:border-sky-500 focus:ring-sky-500/30 dark:border-slate-800"
              )}
            >
              <option value="">Select location…</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                  {location.code ? ` (${location.code})` : ''}
                </option>
              ))}
            </select>
            {state.errors?.locationId?.[0] && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{state.errors.locationId[0]}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Quantity change"
            name="quantity"
            type="number"
            required
            placeholder="Use negative numbers to decrease stock"
            className="w-32"
            error={state.errors?.quantity?.[0]}
          />
          <div className="space-y-2">
            <label htmlFor="adjust-reason" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Reason
            </label>
            <input
              id="adjust-reason"
              name="reason"
              placeholder="e.g. intake, waste"
              className="max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="adjust-note" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Note
          </label>
          <textarea
            id="adjust-note"
            name="note"
            rows={3}
            placeholder="Optional context"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
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


