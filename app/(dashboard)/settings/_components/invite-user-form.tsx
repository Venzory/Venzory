'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PracticeRole } from '@prisma/client';
import { toast } from '@/lib/toast';
import { fetcher } from '@/lib/fetcher';
import { ClientApiError, toUserMessage } from '@/lib/client-error';

type FormState = {
  email: string;
  role: PracticeRole;
  name: string;
};

interface InviteUserFormProps {
  practiceId: string;
  practiceName: string;
}

export function InviteUserForm({ practiceId, practiceName }: InviteUserFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({
    email: '',
    role: PracticeRole.STAFF,
    name: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (success) {
      toast.success(success);
    } else if (error) {
      toast.error(error);
    }
  }, [success, error]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setState((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate email
    if (!state.email || !state.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      await fetcher.post('/api/invites', {
        body: {
          email: state.email,
          role: state.role,
          name: state.name || undefined,
          practiceId,
        },
      });

      // Success - reset form and show success message
      setSuccess(`Invitation sent to ${state.email}`);
      setState({
        email: '',
        role: PracticeRole.STAFF,
        name: '',
      });
      setIsSubmitting(false);

      // Refresh the page to show the new pending invite
      router.refresh();
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(toUserMessage(err));
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  const disableForm = isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-700 dark:text-slate-300">
        Send an invitation to add a new user to <strong>{practiceName}</strong>.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Email address <span className="text-rose-600 dark:text-rose-400">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={state.email}
            onChange={handleChange}
            disabled={disableForm}
            placeholder="user@example.com"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Role <span className="text-rose-600 dark:text-rose-400">*</span>
          </label>
          <select
            id="role"
            name="role"
            required
            value={state.role}
            onChange={handleChange}
            disabled={disableForm}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value={PracticeRole.VIEWER}>Viewer - Read-only access</option>
            <option value={PracticeRole.STAFF}>Staff - Standard access</option>
            <option value={PracticeRole.ADMIN}>Admin - Full access</option>
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
          value={state.name}
          onChange={handleChange}
          disabled={disableForm}
          placeholder="Pre-fill name for invitee"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      <button
        type="submit"
        disabled={disableForm}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
      >
        {isSubmitting ? 'Sending invitation...' : 'Send invitation'}
      </button>
    </form>
  );
}

