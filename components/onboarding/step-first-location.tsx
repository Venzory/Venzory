'use client';

import { useState, useTransition } from 'react';
import { createFirstLocation } from '@/app/actions/onboarding';
import { useToast } from '@/hooks/use-toast';

interface StepFirstLocationProps {
  onNext: () => void;
  onBack: () => void;
}

export function StepFirstLocation({ onNext, onBack }: StepFirstLocationProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(async () => {
      const result = await createFirstLocation(formData);
      
      if (result.success) {
        onNext();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create location',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Create First Location</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Where do you keep your stock? This could be a &quot;Main Stockroom&quot;, &quot;Front Desk&quot;, or &quot;Exam Room 1&quot;.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Location Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            placeholder="e.g. Main Stockroom"
            value={formData.name}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-500 px-6 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? 'Creating...' : 'Continue'}
        </button>
      </div>
    </form>
  );
}

