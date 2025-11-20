'use client';

import { useActionState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { FormState } from '@/lib/form-types';

import { upsertLocationAction } from '../../inventory/actions';
import { SubmitButton } from '@/components/ui/submit-button';

type LocationOption = {
  id: string;
  name: string;
};

const initialState: FormState = {};

export function CreateLocationForm({ locations }: { locations: LocationOption[] }) {
  const [state, formAction] = useActionState(upsertLocationAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
    } else if (state.error) {
      toast.error(state.error);
    }
    // Don't toast field errors - they're shown inline
  }, [state]);

  return (
    <form action={formAction} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Add location</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Represent storage rooms, treatment areas, or warehouse zones.</p>
      </div>

      {state.error && (
        <div className="rounded-lg bg-rose-900/20 border border-rose-800 p-4">
          <p className="text-sm text-rose-300">{state.error}</p>
        </div>
      )}

      <Input
        label="Name"
        name="name"
        id="location-name"
        required
        error={state.errors?.name?.[0]}
      />

      <div className="space-y-4">
        <Input
          label="Code"
          id="location-code"
          name="code"
          placeholder="Optional short code"
        />

        <Select
          label="Parent location"
          id="location-parent"
          name="parentId"
          defaultValue="none"
        >
          <option value="none">Top level</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </Select>
      </div>

      <Textarea
        label="Description"
        id="location-description"
        name="description"
        rows={3}
        placeholder="Optional details such as access hours or storage constraints"
      />

      <SubmitButton variant="primary" loadingText="Saving…">Create location</SubmitButton>
    </form>
  );
}


