'use client';

import { useFormState, useFormStatus } from 'react-dom';

import { createStockAdjustmentAction } from '../actions';

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

const initialState: FormState = {};

export function StockAdjustmentForm({
  items,
  locations,
}: {
  items: ItemOption[];
  locations: LocationOption[];
}) {
  const [state, formAction] = useFormState(createStockAdjustmentAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Record stock adjustment</h2>
        <p className="text-sm text-slate-400">Adjust on-hand quantity for a specific item and location.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="adjust-item" className="text-sm font-medium text-slate-200">
            Item
          </label>
          <select
            id="adjust-item"
            name="itemId"
            required
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
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
          <label htmlFor="adjust-location" className="text-sm font-medium text-slate-200">
            Location
          </label>
          <select
            id="adjust-location"
            name="locationId"
            required
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
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
        <div className="space-y-2">
          <label htmlFor="adjust-quantity" className="text-sm font-medium text-slate-200">
            Quantity change
          </label>
          <input
            id="adjust-quantity"
            name="quantity"
            type="number"
            required
            placeholder="Use negative numbers to decrease stock"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="adjust-reason" className="text-sm font-medium text-slate-200">
            Reason
          </label>
          <input
            id="adjust-reason"
            name="reason"
            placeholder="e.g. intake, waste"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="adjust-note" className="text-sm font-medium text-slate-200">
            Note
          </label>
          <textarea
            id="adjust-note"
            name="note"
            rows={3}
            placeholder="Optional context"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
      </div>

      {state.error ? <p className="text-sm text-rose-400">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-400">{state.success}</p> : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Recording…' : 'Save adjustment'}
    </button>
  );
}

