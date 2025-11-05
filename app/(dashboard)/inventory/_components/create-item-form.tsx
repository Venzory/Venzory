'use client';

import { useFormState, useFormStatus } from 'react-dom';

import { upsertItemAction } from '../actions';

type SupplierOption = {
  id: string;
  name: string;
};

type FormState = {
  success?: string;
  error?: string;
};

const initialState: FormState = {};

export function CreateItemForm({ suppliers }: { suppliers: SupplierOption[] }) {
  const [state, formAction] = useFormState(upsertItemAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Add inventory item</h2>
        <p className="text-sm text-slate-400">Define catalog details and optional default supplier.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="item-name" className="text-sm font-medium text-slate-200">
            Name
          </label>
          <input
            id="item-name"
            name="name"
            required
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="item-sku" className="text-sm font-medium text-slate-200">
            SKU
          </label>
          <input
            id="item-sku"
            name="sku"
            placeholder="Optional"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="item-description" className="text-sm font-medium text-slate-200">
            Description
          </label>
          <textarea
            id="item-description"
            name="description"
            rows={3}
            placeholder="Optional"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="item-unit" className="text-sm font-medium text-slate-200">
            Unit
          </label>
          <input
            id="item-unit"
            name="unit"
            placeholder="e.g. box, piece"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="item-supplier" className="text-sm font-medium text-slate-200">
            Default supplier
          </label>
          <select
            id="item-supplier"
            name="defaultSupplierId"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            defaultValue="none"
          >
            <option value="none">No default</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error ? <p className="text-sm text-rose-400">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-400">{state.success}</p> : null}

      <SubmitButton label="Create item" />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Saving…' : label}
    </button>
  );
}

