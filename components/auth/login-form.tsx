'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

type FormState = {
  email: string;
  password: string;
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<FormState>({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const callbackUrl = useMemo(() => searchParams.get('callbackUrl') ?? '/dashboard', [searchParams]);
  const resetSuccess = useMemo(() => searchParams.get('reset') === 'success', [searchParams]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn('credentials', {
        email: state.email,
        password: state.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password.');
        setIsSubmitting(false);
        return;
      }

      if (result?.ok) {
        // Force a hard navigation to trigger middleware
        window.location.href = callbackUrl;
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  const disableForm = isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {resetSuccess ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/30">
          <p className="text-sm text-emerald-800 dark:text-emerald-300">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Email
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
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Password
          </label>
          <Link href="/forgot-password" tabIndex={-1} className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={state.password}
            onChange={handleChange}
            disabled={disableForm}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
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

      {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
      <button
        type="submit"
      disabled={disableForm}
        className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
      {disableForm ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

