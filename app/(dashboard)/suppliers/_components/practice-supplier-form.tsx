'use client';

import { useActionState, useEffect } from 'react';
import { toast } from '@/lib/toast';

import { updatePracticeSupplierAction } from '../actions';
import { SubmitButton } from '@/components/ui/submit-button';
import type { PracticeSupplierWithRelations } from '@/src/domain/models/suppliers';

type FormState = {
  success?: string;
  error?: string;
};

const initialState: FormState = {};

interface PracticeSupplierFormProps {
  practiceSupplier: PracticeSupplierWithRelations;
}

export function PracticeSupplierForm({ practiceSupplier }: PracticeSupplierFormProps) {
  const [state, formAction] = useActionState(updatePracticeSupplierAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="practiceSupplierId" value={practiceSupplier.id} />

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="customLabel" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Custom Display Name
          </label>
          <input
            id="customLabel"
            name="customLabel"
            type="text"
            defaultValue={practiceSupplier.customLabel ?? ''}
            placeholder={practiceSupplier.globalSupplier?.name ?? 'Supplier name'}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Use a different name for this supplier in your practice (optional)
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="accountNumber" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Account / Customer Number
          </label>
          <input
            id="accountNumber"
            name="accountNumber"
            type="text"
            defaultValue={practiceSupplier.accountNumber ?? ''}
            placeholder="e.g., CUST-12345"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Your practice&apos;s account number at this supplier
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="orderingNotes" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Ordering & Delivery Notes
          </label>
          <textarea
            id="orderingNotes"
            name="orderingNotes"
            rows={4}
            defaultValue={practiceSupplier.orderingNotes ?? ''}
            placeholder="e.g., Call before delivery, use back entrance, payment terms..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Special instructions for ordering or delivery
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="isPreferred" className="text-sm font-medium text-slate-900 dark:text-slate-200">
                Preferred Supplier
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Mark as a preferred supplier for your practice
              </p>
            </div>
            <input
              id="isPreferred"
              name="isPreferred"
              type="checkbox"
              defaultChecked={practiceSupplier.isPreferred}
              value="true"
              className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500/30 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
            <div>
              <label htmlFor="isBlocked" className="text-sm font-medium text-slate-900 dark:text-slate-200">
                Block Supplier
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Hide from order creation (view only)
              </p>
            </div>
            <input
              id="isBlocked"
              name="isBlocked"
              type="checkbox"
              defaultChecked={practiceSupplier.isBlocked}
              value="true"
              className="h-5 w-5 rounded border-slate-300 text-rose-600 focus:ring-2 focus:ring-rose-500/30 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </div>
      </div>

      {state.error && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
          {state.error}
        </div>
      )}

      <SubmitButton variant="primary" loadingText="Saving...">
        Save Changes
      </SubmitButton>
    </form>
  );
}

