'use client';

import { useActionState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { Input } from '@/components/ui/input';

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
      <div className="max-w-lg">
        <Input
          label="Practice Name"
          id="practice-name"
          name="name"
          defaultValue={practice.name}
          required
          error={state.errors?.name?.[0]}
        />
        {!state.errors?.name?.[0] && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            This name appears in invitations and throughout the application.
          </p>
        )}
      </div>

      {/* Address Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-200">Address</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Street"
              id="street"
              name="street"
              defaultValue={practice.street ?? ''}
            />
          </div>
          <div>
            <Input
              label="City"
              id="city"
              name="city"
              defaultValue={practice.city ?? ''}
            />
          </div>
          <div>
            <Input
              label="Postal Code"
              id="postalCode"
              name="postalCode"
              defaultValue={practice.postalCode ?? ''}
            />
          </div>
          <div>
            <Input
              label="Country"
              id="country"
              name="country"
              defaultValue={practice.country ?? ''}
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-200">Contact Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Input
              label="Contact Email"
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={practice.contactEmail ?? ''}
              error={state.errors?.contactEmail?.[0]}
            />
          </div>
          <div>
            <Input
              label="Contact Phone"
              id="contactPhone"
              name="contactPhone"
              type="tel"
              defaultValue={practice.contactPhone ?? ''}
            />
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="max-w-lg">
        <Input
          label="Logo URL"
          id="logoUrl"
          name="logoUrl"
          type="url"
          defaultValue={practice.logoUrl ?? ''}
          placeholder="https://example.com/logo.png"
          error={state.errors?.logoUrl?.[0]}
        />
        {!state.errors?.logoUrl?.[0] && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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


