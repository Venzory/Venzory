'use client';

import { useActionState, useEffect } from 'react';
import { toast } from '@/lib/toast';

import { createStockAdjustmentAction } from '../actions';
import { SubmitButton } from '@/components/ui/submit-button';

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

type FormState = {
  success?: string;
  error?: string;
};

const initialState: FormState = {
  error: undefined,
  success: undefined,
};

export function StockAdjustmentForm({
  items,
  locations,
}: {
  items: ItemOption[];
  locations: LocationOption[];
}) {
  const [state, formAction] = useActionState(createStockAdjustmentAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Record stock adjustment</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Adjust on-hand quantity for a specific item and location.</p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="adjust-item" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Item
            </label>
            <select
              id="adjust-item"
              name="itemId"
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">Select item…</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.sku ? ` (${item.sku})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="adjust-location" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Location
            </label>
            <select
              id="adjust-location"
              name="locationId"
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">Select location…</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                  {location.code ? ` (${location.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="adjust-quantity" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Quantity change
            </label>
            <input
              id="adjust-quantity"
              name="quantity"
              type="number"
              required
              placeholder="Use negative numbers to decrease stock"
              className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="adjust-reason" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Reason
            </label>
            <input
              id="adjust-reason"
              name="reason"
              placeholder="e.g. intake, waste"
              className="max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {state.error ? <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.success}</p> : null}

      <SubmitButton variant="primary" loadingText="Recording…" className="bg-emerald-500 hover:bg-emerald-400 focus:ring-emerald-500 shadow-lg shadow-emerald-500/30">
        Save adjustment
      </SubmitButton>
    </form>
  );
}


