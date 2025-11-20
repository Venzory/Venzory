'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type FormState = {
  email: string;
};

export function ForgotPasswordForm() {
  const [state, setState] = useState<FormState>({ email: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: state.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send reset email');
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setState({ email: '' });
      setIsSubmitting(false);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const disableForm = isSubmitting || success;

  return (
    <div className="space-y-6">
      {success ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/30">
          <p className="text-sm text-emerald-800 dark:text-emerald-300">
            If an account exists with that email, you will receive a password reset link shortly. 
            Please check your inbox and spam folder.
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Email address
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
            placeholder="Enter your email"
            className={cn(
              "w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70",
              "bg-white text-slate-900 placeholder:text-slate-400 border-slate-300",
              "dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:border-slate-800",
              "focus:border-sky-500 focus:ring-sky-500/30"
            )}
          />
        </div>

        {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}

        <button
          type="submit"
          disabled={disableForm}
          className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Sending...' : success ? 'Email sent' : 'Send reset link'}
        </button>
      </form>
    </div>
  );
}
