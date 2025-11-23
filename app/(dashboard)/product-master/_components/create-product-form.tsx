'use client';

import { useActionState } from 'react';

import { createProductAction } from '../actions';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
        <Input
          label="Product Name"
          id="product-name"
          name="name"
          required
          placeholder="e.g. Sterile Gauze Bandage"
        />

        <div>
          <Input
            label="GTIN / Barcode"
            id="product-gtin"
            name="gtin"
            placeholder="e.g. 08712345678906"
            maxLength={14}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Optional. Must be 8, 12, 13, or 14 digits. GS1 lookup will be attempted automatically.
          </p>
        </div>

        <Input
          label="Brand / Manufacturer"
          id="product-brand"
          name="brand"
          placeholder="e.g. McKesson"
        />

        <Textarea
          label="Description"
          id="product-description"
          name="description"
          placeholder="Optional product description..."
          rows={3}
        />
      </div>

      {state.error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          {state.success}
        </div>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton>Create Product</SubmitButton>
      </div>
    </form>
  );
}

