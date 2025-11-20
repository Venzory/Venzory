'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

type FormState = {
  password: string;
  confirmPassword: string;
};

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({ password: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

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
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: state.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to reset password');
        setIsSubmitting(false);
        return;
      }

      // Success - redirect to login with success message
      router.push('/login?reset=success');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const disableForm = isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            value={state.password}
            onChange={handleChange}
            disabled={disableForm}
            placeholder="At least 8 characters"
            className={cn(
              "w-full rounded-lg border px-3 py-2 pr-10 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70",
              "bg-white text-slate-900 placeholder:text-slate-400 border-slate-300",
              "dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:border-slate-800",
              "focus:border-sky-500 focus:ring-sky-500/30"
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Confirm new password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            value={state.confirmPassword}
            onChange={handleChange}
            disabled={disableForm}
            placeholder="Re-enter your password"
            className={cn(
              "w-full rounded-lg border px-3 py-2 pr-10 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70",
              "bg-white text-slate-900 placeholder:text-slate-400 border-slate-300",
              "dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:border-slate-800",
              "focus:border-sky-500 focus:ring-sky-500/30"
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}

      <button
        type="submit"
        disabled={disableForm}
        className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? 'Resetting password...' : 'Reset password'}
      </button>
    </form>
  );
}
