'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PracticeRole } from '@prisma/client';

type FormState = {
  name: string;
  password: string;
  confirmPassword: string;
};

interface AcceptInviteFormProps {
  token: string;
  email: string;
  practiceName: string;
  role: PracticeRole;
  inviterName: string | null;
}

export function AcceptInviteForm({ 
  token, 
  email, 
  practiceName, 
  role,
  inviterName 
}: AcceptInviteFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({ 
    name: inviterName || '', 
    password: '', 
    confirmPassword: '' 
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    // Validate name
    if (state.name.trim().length < 1) {
      setError('Name is required');
      return;
    }

    // Validate passwords match
    if (state.password !== state.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (state.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: state.name.trim(),
          password: state.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation');
        setIsSubmitting(false);
        return;
      }

      // Success - redirect will be handled by the API (auto-login)
      router.push('/dashboard');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const disableForm = isSubmitting;
  const roleDisplay = role.charAt(0) + role.slice(1).toLowerCase();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-sky-800 bg-sky-900/20 p-4">
        <p className="text-sm text-sky-300">
          You&apos;re joining <strong>{practiceName}</strong> as a <strong>{roleDisplay}</strong>
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Email: {email}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-slate-200">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={state.name}
          onChange={handleChange}
          disabled={disableForm}
          placeholder="Your full name"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-slate-200">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={state.password}
          onChange={handleChange}
          disabled={disableForm}
          placeholder="At least 8 characters"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-200">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={state.confirmPassword}
          onChange={handleChange}
          disabled={disableForm}
          placeholder="Re-enter your password"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <button
        type="submit"
        disabled={disableForm}
        className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? 'Setting up your account...' : 'Accept invitation'}
      </button>
    </form>
  );
}

