'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type FormState = {
  email: string;
  password: string;
};

type LoginMethod = 'credentials' | 'email';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [method, setMethod] = useState<LoginMethod>('credentials');
  const [state, setState] = useState<FormState>({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (method === 'email') {
        const result = await signIn('resend', {
          email: state.email,
          redirect: false,
          callbackUrl,
        });

        if (result?.error) {
          setError('Failed to send login link. Please try again.');
        } else {
          setSuccess('Check your email! We sent you a magic link to sign in.');
          // Keep form disabled to prevent double submission, but allow switching back if needed
        }
        setIsSubmitting(false);
      } else {
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
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  const disableForm = isSubmitting;

  return (
    <div className="space-y-6">
      {resetSuccess && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/30">
          <p className="text-sm text-emerald-800 dark:text-emerald-300">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
        </div>
      )}

      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/50">
        <button
          type="button"
          onClick={() => {
            setMethod('credentials');
            setError(null);
            setSuccess(null);
          }}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-medium transition-all',
            method === 'credentials'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          <KeyRound className="h-4 w-4" />
          Password
        </button>
        <button
          type="button"
          onClick={() => {
            setMethod('email');
            setError(null);
            setSuccess(null);
          }}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-medium transition-all',
            method === 'email'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          <Mail className="h-4 w-4" />
          Magic Link
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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

        {method === 'credentials' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Password
              </label>
              <Link
                href="/forgot-password"
                tabIndex={-1}
                className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
              >
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
        )}

        {error ? <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p> : null}

        <button
          type="submit"
          disabled={disableForm || (success !== null && method === 'email')}
          className={cn(
            "w-full rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-70",
            method === 'email' 
              ? "bg-slate-800 hover:bg-slate-700 shadow-slate-500/30 dark:bg-slate-700 dark:hover:bg-slate-600" 
              : "bg-sky-500 hover:bg-sky-400 shadow-sky-500/30"
          )}
        >
          {isSubmitting 
            ? (method === 'email' ? 'Sending Link…' : 'Signing in…') 
            : (method === 'email' ? 'Send Magic Link' : 'Sign in')
          }
        </button>
      </form>
    </div>
  );
}

