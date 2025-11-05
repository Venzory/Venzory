'use client';

import { useFormState, useFormStatus } from 'react-dom';

import { upsertSupplierAction } from '../../inventory/actions';

type FormState = {
  success?: string;
  error?: string;
};

const initialState: FormState = {};

export function CreateSupplierForm() {
  const [state, formAction] = useFormState(upsertSupplierAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Add supplier</h2>
        <p className="text-sm text-slate-400">Track contact details and link preferred items.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="supplier-name" className="text-sm font-medium text-slate-200">
          Name
        </label>
        <input
          id="supplier-name"
          name="name"
          required
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="supplier-email" className="text-sm font-medium text-slate-200">
            Email
          </label>
          <input
            id="supplier-email"
            name="email"
            type="email"
            placeholder="contact@example.com"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="supplier-phone" className="text-sm font-medium text-slate-200">
            Phone
          </label>
          <input
            id="supplier-phone"
            name="phone"
            placeholder="+31 6 1234 5678"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="supplier-website" className="text-sm font-medium text-slate-200">
          Website
        </label>
        <input
          id="supplier-website"
          name="website"
          type="url"
          placeholder="https://example.com"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="supplier-notes" className="text-sm font-medium text-slate-200">
          Notes
        </label>
        <textarea
          id="supplier-notes"
          name="notes"
          rows={3}
          placeholder="Payment terms, account numbers, etc."
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
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
      className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Saving…' : 'Create supplier'}
    </button>
  );
}

