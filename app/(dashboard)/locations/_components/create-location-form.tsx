'use client';

import { useFormState, useFormStatus } from 'react-dom';

import { upsertLocationAction } from '../../inventory/actions';

type LocationOption = {
  id: string;
  name: string;
};

type FormState = {
  success?: string;
  error?: string;
};

const initialState: FormState = {};

export function CreateLocationForm({ locations }: { locations: LocationOption[] }) {
  const [state, formAction] = useFormState(upsertLocationAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Add location</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Represent storage rooms, treatment areas, or warehouse zones.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="location-name" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Name
        </label>
        <input
          id="location-name"
          name="name"
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="location-code" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Code
          </label>
          <input
            id="location-code"
            name="code"
            placeholder="Optional short code"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="location-parent" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Parent location
          </label>
          <select
            id="location-parent"
            name="parentId"
            defaultValue="none"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="none">Top level</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="location-description" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Description
        </label>
        <textarea
          id="location-description"
          name="description"
          rows={3}
          placeholder="Optional details such as access hours or storage constraints"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      {state.error ? <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.success}</p> : null}

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
      {pending ? 'Saving…' : 'Create location'}
    </button>
  );
}

