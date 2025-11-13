'use client';

import { useActionState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

import { updatePracticeSettingsAction } from '../actions';
import { SubmitButton } from '@/components/ui/submit-button';

type FormState = {
  success?: string;
  error?: string;
  errors?: Record<string, string[]>;
};

const initialState: FormState = {};

type PracticeSettingsFormProps = {
  practice: {
    name: string;
    street: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    logoUrl: string | null;
  };
};

export function PracticeSettingsForm({ practice }: PracticeSettingsFormProps) {
  const [state, formAction] = useActionState(updatePracticeSettingsAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
    } else if (state.error) {
      toast.error(state.error);
    }
    // Don't toast field errors - they're shown inline
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      {/* Practice Name */}
      <div className="space-y-2 max-w-lg">
        <label htmlFor="practice-name" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Practice Name
        </label>
        <input
          id="practice-name"
          name="name"
          type="text"
          defaultValue={practice.name}
          required
          className={cn(
            "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100",
            state.errors?.name
              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/30 dark:border-rose-500"
              : "border-slate-300 focus:border-sky-500 focus:ring-sky-500/30 dark:border-slate-800"
          )}
        />
        {state.errors?.name?.[0] ? (
          <p className="text-xs text-rose-600 dark:text-rose-400">{state.errors.name[0]}</p>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This name appears in invitations and throughout the application.
          </p>
        )}
      </div>

      {/* Address Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-200">Address</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="street" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Street
            </label>
            <input
              id="street"
              name="street"
              type="text"
              defaultValue={practice.street ?? ''}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="city" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              City
            </label>
            <input
              id="city"
              name="city"
              type="text"
              defaultValue={practice.city ?? ''}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="postalCode" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Postal Code
            </label>
            <input
              id="postalCode"
              name="postalCode"
              type="text"
              defaultValue={practice.postalCode ?? ''}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="country" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Country
            </label>
            <input
              id="country"
              name="country"
              type="text"
              defaultValue={practice.country ?? ''}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-200">Contact Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="contactEmail" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Contact Email
            </label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={practice.contactEmail ?? ''}
              className={cn(
                "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100",
                state.errors?.contactEmail
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/30 dark:border-rose-500"
                  : "border-slate-300 focus:border-sky-500 focus:ring-sky-500/30 dark:border-slate-800"
              )}
            />
            {state.errors?.contactEmail?.[0] && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{state.errors.contactEmail[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="contactPhone" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Contact Phone
            </label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              defaultValue={practice.contactPhone ?? ''}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="space-y-2 max-w-lg">
        <label htmlFor="logoUrl" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Logo URL
        </label>
        <input
          id="logoUrl"
          name="logoUrl"
          type="url"
          defaultValue={practice.logoUrl ?? ''}
          placeholder="https://example.com/logo.png"
          className={cn(
            "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
            state.errors?.logoUrl
              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/30 dark:border-rose-500"
              : "border-slate-300 focus:border-sky-500 focus:ring-sky-500/30 dark:border-slate-800"
          )}
        />
        {state.errors?.logoUrl?.[0] ? (
          <p className="text-xs text-rose-600 dark:text-rose-400">{state.errors.logoUrl[0]}</p>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enter the URL of your practice logo image.
          </p>
        )}
      </div>

      {state.error && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
          {state.error}
        </div>
      )}

      <SubmitButton variant="primary" loadingText="Saving…">Save Practice Settings</SubmitButton>
    </form>
  );
}


