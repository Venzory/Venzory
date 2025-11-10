'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { createStockCountSessionAction } from '../../actions';

interface NewCountFormProps {
  locations: { id: string; name: string }[];
}

export function NewCountForm({ locations }: NewCountFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(createStockCountSessionAction, null);

  useEffect(() => {
    if (state && 'sessionId' in state && state.sessionId) {
      router.push(`/stock-count/${state.sessionId}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6 rounded-lg border border-card-border bg-card p-6">
      {state?.error && (
        <div className="rounded-lg bg-rose-900/20 border border-rose-800 p-4">
          <p className="text-sm text-rose-300">{state.error}</p>
        </div>
      )}

      {/* Location */}
      <div className="space-y-2">
        <label htmlFor="locationId" className="block text-sm font-medium text-slate-900 dark:text-slate-200">
          Count Location *
        </label>
        <select
          id="locationId"
          name="locationId"
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          style={{ minHeight: '48px' }}
        >
          <option value="">Select a location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
        {locations.length === 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            No locations found. Please create a location first.
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label htmlFor="notes" className="block text-sm font-medium text-slate-900 dark:text-slate-200">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={512}
          placeholder="E.g., Monthly count for shelf A..."
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full sm:w-auto rounded-lg border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          style={{ minHeight: '48px' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={locations.length === 0}
          className="w-full sm:w-auto rounded-lg bg-sky-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: '48px' }}
        >
          Start Count
        </button>
      </div>
    </form>
  );
}

