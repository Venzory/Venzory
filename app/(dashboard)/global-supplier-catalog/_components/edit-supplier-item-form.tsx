'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFormState } from 'react-dom';

import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/ui/submit-button';
import { updateSupplierItemAction } from '../actions';
import type { SupplierItem } from '@/src/domain/models';

type SupplierItemRow = SupplierItem & {
  product?: {
    id: string;
    name: string;
    brand?: string | null;
  } | null;
  globalSupplier?: {
    id: string;
    name: string;
  } | null;
};

export function EditSupplierItemForm({ supplierItem }: { supplierItem: SupplierItemRow }) {
  const [state, formAction] = useFormState(updateSupplierItemAction, undefined);
  const [status, setStatus] = useState(supplierItem.isActive ? 'true' : 'false');

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="productId" value={supplierItem.productId} />
      <input type="hidden" name="globalSupplierId" value={supplierItem.globalSupplierId} />

      <div className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">
            {supplierItem.globalSupplier?.name ?? 'Unknown supplier'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Feeding {supplierItem.product?.name ?? 'Unnamed product'}
          </div>
        </div>
        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Supplier Item ID: {supplierItem.id}
        </div>
      </div>

      {state?.error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {state?.success && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{state.success}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Supplier SKU
          </label>
          <Input
            name="supplierSku"
            defaultValue={supplierItem.supplierSku ?? ''}
            placeholder="Enter supplier SKU"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Currency
          </label>
          <Input
            name="currency"
            defaultValue={supplierItem.currency ?? 'EUR'}
            placeholder="Currency code (e.g. EUR)"
            maxLength={8}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Unit Price
          </label>
          <Input
            name="unitPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={supplierItem.unitPrice ?? ''}
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Minimum Order Quantity
          </label>
          <Input
            name="minOrderQty"
            type="number"
            min="1"
            step="1"
            defaultValue={supplierItem.minOrderQty ?? ''}
            placeholder="1"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Entry Status
          </label>
          <select
            name="isActive"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <p>Last updated: {new Date(supplierItem.updatedAt).toLocaleString()}</p>
          <p>Created: {new Date(supplierItem.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <SubmitButton variant="primary" loadingText="Saving...">
          Save Changes
        </SubmitButton>
      </div>
    </form>
  );
}

