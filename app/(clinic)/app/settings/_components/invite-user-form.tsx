'use client';

import { useActionState, useEffect, useRef } from 'react';
import { PracticeRole } from '@prisma/client';
import { toast } from '@/lib/toast';
import { Input } from '@/components/ui/input';
import { inviteUserAction } from '../actions';
import type { FormState } from '@/lib/form-types';

const initialState: FormState = {};

interface InviteUserFormProps {
  practiceId: string;
  practiceName: string;
}

export function InviteUserForm({ practiceId, practiceName }: InviteUserFormProps) {
  const [state, formAction] = useActionState(inviteUserAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      // Reset form after successful invitation
      formRef.current?.reset();
    } else if (state.error) {
      toast.error(state.error);
    }
    // Don't toast field errors - they're shown inline
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <p className="text-sm text-slate-700 dark:text-slate-300">
        Send an invitation to add a new user to <strong>{practiceName}</strong>.
      </p>

      {state.error && (
        <div className="rounded-lg bg-rose-900/20 border border-rose-800 p-4">
          <p className="text-sm text-rose-300">{state.error}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="user@example.com"
          error={state.errors?.email?.[0]}
        />

        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Role <span className="text-rose-600 dark:text-rose-400">*</span>
          </label>
          <select
            id="role"
            name="role"
            required
            defaultValue={PracticeRole.STAFF}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value={PracticeRole.STAFF}>Staff - Day-to-day operations</option>
            <option value={PracticeRole.MANAGER}>Manager - Team lead access</option>
            <option value={PracticeRole.ADMIN}>Admin - Full management access</option>
          </select>
        </div>
      </div>

      <div className="space-y-2 max-w-lg">
        <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Full name <span className="text-slate-500 dark:text-slate-500">(optional)</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Pre-fill name for invitee"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
      >
        Send invitation
      </button>
    </form>
  );
}

