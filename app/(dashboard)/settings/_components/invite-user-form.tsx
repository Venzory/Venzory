'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PracticeRole } from '@prisma/client';

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
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.email,
          role: state.role,
          name: state.name || undefined,
          practiceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send invitation');
        setIsSubmitting(false);
        return;
      }

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
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const disableForm = isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-300">
        Send an invitation to add a new user to <strong>{practiceName}</strong>.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-200">
            Email address <span className="text-rose-400">*</span>
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
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-medium text-slate-200">
            Role <span className="text-rose-400">*</span>
          </label>
          <select
            id="role"
            name="role"
            required
            value={state.role}
            onChange={handleChange}
            disabled={disableForm}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <option value={PracticeRole.VIEWER}>Viewer - Read-only access</option>
            <option value={PracticeRole.STAFF}>Staff - Standard access</option>
            <option value={PracticeRole.ADMIN}>Admin - Full access</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-slate-200">
          Full name <span className="text-slate-500">(optional)</span>
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
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-rose-800 bg-rose-900/30 p-3">
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-800 bg-green-900/30 p-3">
          <p className="text-sm text-green-300">{success}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={disableForm}
        className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? 'Sending invitation...' : 'Send invitation'}
      </button>
    </form>
  );
}

