'use client';

import { useActionState } from 'react';

import { createProductAction } from '../actions';
import { SubmitButton } from '@/components/ui/submit-button';

type FormState = {
  success?: string;
  error?: string;
  productId?: string;
};

const initialState: FormState = {};

export function CreateProductForm() {
  const [state, formAction] = useActionState(createProductAction, initialState);

  return (
    <form action={formAction} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Add Product</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Create a new canonical product in the catalog.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="product-name" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Product Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="product-name"
            name="name"
            required
            placeholder="e.g. Sterile Gauze Bandage"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="product-gtin" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            GTIN / Barcode
          </label>
          <input
            id="product-gtin"
            name="gtin"
            placeholder="e.g. 08712345678906"
            maxLength={14}
            className="max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Optional. Must be 8, 12, 13, or 14 digits. GS1 lookup will be attempted automatically.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="product-brand" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Brand / Manufacturer
          </label>
          <input
            id="product-brand"
            name="brand"
            placeholder="e.g. 3M, Johnson & Johnson"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="product-description" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Description
          </label>
          <textarea
            id="product-description"
            name="description"
            rows={4}
            placeholder="Detailed product description..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>
      ) : null}
      {state.success ? (
        <div className="space-y-2">
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.success}</p>
          {state.productId ? (
            <a
              href={`/settings/products/${state.productId}`}
              className="inline-block text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              View product →
            </a>
          ) : null}
        </div>
      ) : null}

      <SubmitButton variant="primary" loadingText="Creating...">Create Product</SubmitButton>
    </form>
  );
}


