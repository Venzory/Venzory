'use client';

import { useActionState, useEffect } from 'react';
import { toast } from '@/lib/toast';

import { upsertItemAction } from '../actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';

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
  const [state, formAction] = useActionState(upsertItemAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Add inventory item</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Define catalog details and optional default supplier.</p>
      </div>

      <div className="space-y-4">
        <Input label="Name" name="name" id="item-name" required />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="item-sku" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              SKU
            </label>
            <input
              id="item-sku"
              name="sku"
              placeholder="Optional"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="item-gtin" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              GTIN / Barcode
            </label>
            <input
              id="item-gtin"
              name="gtin"
              placeholder="e.g. 08712345678906"
              maxLength={14}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="item-brand" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Brand
            </label>
            <input
              id="item-brand"
              name="brand"
              placeholder="Optional"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="item-description" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Description
          </label>
          <textarea
            id="item-description"
            name="description"
            rows={3}
            placeholder="Optional"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="item-unit" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Unit
            </label>
            <input
              id="item-unit"
              name="unit"
              placeholder="e.g. box, piece"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="item-supplier" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Default supplier
            </label>
            <select
              id="item-supplier"
              name="defaultSupplierId"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
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
      </div>

      {state.error ? <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.success}</p> : null}

      <SubmitButton variant="primary" loadingText="Saving…">Create item</SubmitButton>
    </form>
  );
}


