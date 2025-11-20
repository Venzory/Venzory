'use client';

import { useState, useTransition } from 'react';
import { updatePracticeDetails } from '@/app/actions/onboarding';
import { useToast } from '@/hooks/use-toast';

interface StepPracticeDetailsProps {
  onNext: () => void;
  initialName: string;
  initialEmail?: string;
}

export function StepPracticeDetails({ onNext, initialName, initialEmail = '' }: StepPracticeDetailsProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  const [formData, setFormData] = useState({
    name: initialName,
    contactEmail: initialEmail,
    contactPhone: '',
    street: '',
    city: '',
    postalCode: '',
    country: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(async () => {
      const result = await updatePracticeDetails(formData);
      
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="contactEmail" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Contact Email
          </label>
          <input
            type="email"
            id="contactEmail"
            name="contactEmail"
            value={formData.contactEmail}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>
        
        <div className="col-span-2">
           <div className="my-2 border-t border-slate-100 dark:border-slate-800"></div>
           <h3 className="mb-4 text-sm font-medium text-slate-900 dark:text-white">Address</h3>
        </div>

        <div className="col-span-2">
          <label htmlFor="street" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Street Address
          </label>
          <input
            type="text"
            id="street"
            name="street"
            value={formData.street}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="city" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            City
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="postalCode" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Postal Code
          </label>
          <input
            type="text"
            id="postalCode"
            name="postalCode"
            value={formData.postalCode}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>
        
        <div className="col-span-2">
          <label htmlFor="country" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Country
          </label>
          <input
            type="text"
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
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
