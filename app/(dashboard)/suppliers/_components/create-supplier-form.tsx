'use client';

import { useActionState, useEffect } from 'react';
import { toast } from '@/lib/toast';

import { upsertSupplierAction } from '../../inventory/actions';
import { SubmitButton } from '@/components/ui/submit-button';

type FormState = {
  success?: string;
  error?: string;
};

const initialState: FormState = {};

export function CreateSupplierForm() {
  const [state, formAction] = useActionState(upsertSupplierAction, initialState);

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
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Add supplier</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Track contact details and link preferred items.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="supplier-name" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Name
        </label>
        <input
          id="supplier-name"
          name="name"
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="supplier-email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Email
          </label>
          <input
            id="supplier-email"
            name="email"
            type="email"
            placeholder="contact@example.com"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="supplier-phone" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Phone
          </label>
          <input
            id="supplier-phone"
            name="phone"
            placeholder="+31 6 1234 5678"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="supplier-website" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Website
        </label>
        <input
          id="supplier-website"
          name="website"
          type="url"
          placeholder="https://example.com"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="supplier-notes" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Notes
        </label>
        <textarea
          id="supplier-notes"
          name="notes"
          rows={3}
          placeholder="Payment terms, account numbers, etc."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      {state.error ? <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.success}</p> : null}

      <SubmitButton variant="primary" loadingText="Saving…">Create supplier</SubmitButton>
    </form>
  );
}


