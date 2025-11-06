'use client';

import { useState } from 'react';

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
        <div className="rounded-lg border border-emerald-800 bg-emerald-900/30 p-4">
          <p className="text-sm text-emerald-300">
            If an account exists with that email, you will receive a password reset link shortly. 
            Please check your inbox and spam folder.
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-200">
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
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

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

