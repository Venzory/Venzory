'use client';

import { useMemo, useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { updatePracticeDetails } from '@/app/actions/onboarding';
import { useToast } from '@/hooks/use-toast';
import {
  ONBOARDING_COUNTRIES,
  ONBOARDING_COUNTRY_CONFIG,
  practiceDetailsSchema,
  type OnboardingCountry,
  type PracticeDetailsInput,
} from '@/lib/onboarding-validation';

interface StepPracticeDetailsProps {
  onNext: () => void;
  initialName: string;
  initialEmail?: string;
}

export function StepPracticeDetails({ onNext, initialName, initialEmail = '' }: StepPracticeDetailsProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const defaultCountry: OnboardingCountry = 'NL';
  const [formData, setFormData] = useState<PracticeDetailsInput>({
    name: initialName,
    contactEmail: initialEmail,
    contactPhone: `${ONBOARDING_COUNTRY_CONFIG[defaultCountry].phoneDialCode} `,
    street: '',
    houseNumber: '',
    city: '',
    postalCode: '',
    country: defaultCountry,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PracticeDetailsInput, string>>>({});

  const countryOptions = useMemo(
    () =>
      ONBOARDING_COUNTRIES.map((code) => ({
        code,
        label: ONBOARDING_COUNTRY_CONFIG[code].label,
      })),
    [],
  );

  const updateField = (name: keyof PracticeDetailsInput, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateField(name as keyof PracticeDetailsInput, value);
  };

  const handleCountryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextCountry = e.target.value as OnboardingCountry;
    setFormData((prev) => {
      const prevDial = ONBOARDING_COUNTRY_CONFIG[prev.country].phoneDialCode;
      const nextDial = ONBOARDING_COUNTRY_CONFIG[nextCountry].phoneDialCode;
      const trimmedPhone = prev.contactPhone.trim();
      const shouldReplacePhone =
        !trimmedPhone ||
        trimmedPhone === prevDial ||
        trimmedPhone === `${prevDial} ` ||
        (trimmedPhone.startsWith(prevDial) && trimmedPhone.length <= prevDial.length + 2);

      return {
        ...prev,
        country: nextCountry,
        contactPhone: shouldReplacePhone ? `${nextDial} ` : prev.contactPhone,
      };
    });
    setFieldErrors((prev) => ({ ...prev, country: undefined, contactPhone: undefined }));
  };

  const renderError = (field: keyof PracticeDetailsInput) =>
    fieldErrors[field] ? (
      <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">{fieldErrors[field]}</p>
    ) : null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const validation = practiceDetailsSchema.safeParse(formData);
    if (!validation.success) {
      const flattened = validation.error.flatten().fieldErrors;
      const nextErrors: Partial<Record<keyof PracticeDetailsInput, string>> = {};
      Object.entries(flattened).forEach(([key, messages]) => {
        if (messages && messages.length > 0) {
          nextErrors[key as keyof PracticeDetailsInput] = messages[0];
        }
      });
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});

    startTransition(async () => {
      const result = await updatePracticeDetails(validation.data);
      
      if (result.success) {
        onNext();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update details',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Practice Details</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Let&apos;s get your practice information set up correctly.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="col-span-2">
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Practice Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 dark:bg-slate-950 dark:text-white ${
              fieldErrors.name
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500'
                : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-slate-700'
            }`}
          />
          {renderError('name')}
        </div>

        <div>
          <label htmlFor="contactEmail" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Contact Email
          </label>
          <input
            type="email"
            id="contactEmail"
            name="contactEmail"
            required
            value={formData.contactEmail}
            onChange={handleChange}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 dark:bg-slate-950 dark:text-white ${
              fieldErrors.contactEmail
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500'
                : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-slate-700'
            }`}
          />
          {renderError('contactEmail')}
        </div>

        <div>
          <label htmlFor="contactPhone" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Phone Number
          </label>
          <input
            type="tel"
            id="contactPhone"
            name="contactPhone"
            value={formData.contactPhone}
            onChange={handleChange}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 dark:bg-slate-950 dark:text-white ${
              fieldErrors.contactPhone
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500'
                : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-slate-700'
            }`}
          />
          {renderError('contactPhone')}
        </div>
        
        <div className="col-span-2">
           <div className="my-2 border-t border-slate-100 dark:border-slate-800"></div>
           <h3 className="mb-4 text-sm font-medium text-slate-900 dark:text-white">Address</h3>
        </div>

        <div>
          <label htmlFor="street" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Street
          </label>
          <input
            type="text"
            id="street"
            name="street"
            required
            value={formData.street}
            onChange={handleChange}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 dark:bg-slate-950 dark:text-white ${
              fieldErrors.street
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500'
                : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-slate-700'
            }`}
          />
          {renderError('street')}
        </div>

        <div>
          <label htmlFor="houseNumber" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            House Number
          </label>
          <input
            type="text"
            id="houseNumber"
            name="houseNumber"
            required
            value={formData.houseNumber}
            onChange={handleChange}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 dark:bg-slate-950 dark:text-white ${
              fieldErrors.houseNumber
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500'
                : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-slate-700'
            }`}
          />
          {renderError('houseNumber')}
        </div>

        <div>
          <label htmlFor="postalCode" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Postal Code
          </label>
          <input
            type="text"
            id="postalCode"
            name="postalCode"
            required
            value={formData.postalCode}
            onChange={handleChange}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm uppercase outline-none focus:ring-2 dark:bg-slate-950 dark:text-white ${
              fieldErrors.postalCode
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500'
                : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-slate-700'
            }`}
          />
          {renderError('postalCode')}
        </div>

        <div>
          <label htmlFor="city" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            City
          </label>
          <input
            type="text"
            id="city"
            name="city"
            required
            value={formData.city}
            onChange={handleChange}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 dark:bg-slate-950 dark:text-white ${
              fieldErrors.city
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500'
                : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-slate-700'
            }`}
          />
          {renderError('city')}
        </div>

        <div className="col-span-2">
          <label htmlFor="country" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Country
          </label>
          <select
            id="country"
            name="country"
            value={formData.country}
            onChange={handleCountryChange}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 dark:bg-slate-950 dark:text-white ${
              fieldErrors.country
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500'
                : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20 dark:border-slate-700'
            }`}
          >
            {countryOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
          {renderError('country')}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-500 px-6 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </form>
  );
}
