'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, KeyRound, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

type FormState = {
  email: string;
  password: string;
  code: string;
};

type LoginMethod = 'credentials' | 'email' | 'code';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeInputRef = useRef<HTMLInputElement>(null);
  
  const [method, setMethod] = useState<LoginMethod>('credentials');
  const [state, setState] = useState<FormState>({ email: '', password: '', code: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);

  const callbackUrl = useMemo(() => searchParams.get('callbackUrl') ?? '/dashboard', [searchParams]);
  const resetSuccess = useMemo(() => searchParams.get('reset') === 'success', [searchParams]);
  
  // Detect expired magic link from NextAuth error param
  const authError = useMemo(() => searchParams.get('error'), [searchParams]);
  const emailFromParams = useMemo(() => searchParams.get('email'), [searchParams]);

  // Handle expired magic link - show code entry as fallback
  useEffect(() => {
    if (authError === 'Verification') {
      setLinkExpired(true);
      setMethod('code');
      setError(null);
      // Pre-fill email if available
      if (emailFromParams) {
        setState((prev) => ({ ...prev, email: decodeURIComponent(emailFromParams) }));
      }
      // Focus code input after render
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 100);
    }
  }, [authError, emailFromParams]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    
    // For code input, only allow digits and max 6 characters
    if (name === 'code') {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      setState((prev) => ({ ...prev, code: digits }));
      return;
    }
    
    setState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (method === 'code') {
        // Verify 6-digit login code
        if (state.code.length !== 6) {
          setError('Please enter a 6-digit code.');
          setIsSubmitting(false);
          return;
        }

        const response = await fetch('/api/auth/login-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: state.email,
            code: state.code,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to verify code. Please try again.');
          setIsSubmitting(false);
          return;
        }

        // Success - navigate to the callback URL returned by the API
        // This will complete the NextAuth session creation
        if (data.callbackUrl) {
          window.location.href = data.callbackUrl;
        } else {
          // Fallback if no callback URL
          window.location.href = callbackUrl;
        }
        return;
      }

      if (method === 'email') {
        const result = await signIn('resend', {
          email: state.email,
          redirect: false,
          callbackUrl,
        });

        if (result?.error) {
          setError('Failed to send login link. Please try again.');
        } else {
          setSuccess('Check your email! We sent you a magic link and a 6-digit code to sign in.');
          // Reset link expired state since user requested a new email
          setLinkExpired(false);
        }
        setIsSubmitting(false);
      } else {
        // Credentials login
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

  const switchToMethod = (newMethod: LoginMethod) => {
    setMethod(newMethod);
    setError(null);
    setSuccess(null);
    // Keep link expired state only when switching to code method
    if (newMethod !== 'code') {
      setLinkExpired(false);
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

      {/* Expired magic link notice */}
      {linkExpired && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/30">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Your login link has expired, but you can still sign in using the 6-digit code from the same email.
          </p>
        </div>
      )}

      {/* Login method tabs */}
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/50">
        <button
          type="button"
          onClick={() => switchToMethod('credentials')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-all',
            method === 'credentials'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          <KeyRound className="h-4 w-4" />
          <span className="hidden sm:inline">Password</span>
        </button>
        <button
          type="button"
          onClick={() => switchToMethod('email')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-all',
            method === 'email'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          <Mail className="h-4 w-4" />
          <span className="hidden sm:inline">Magic Link</span>
        </button>
        <button
          type="button"
          onClick={() => switchToMethod('code')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-all',
            method === 'code'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          <Hash className="h-4 w-4" />
          <span className="hidden sm:inline">Code</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email field - shown for all methods */}
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

        {/* Password field - only for credentials method */}
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

        {/* Code field - only for code method */}
        {method === 'code' && (
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              6-Digit Code
            </label>
            <input
              ref={codeInputRef}
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              required
              maxLength={6}
              placeholder="000000"
              value={state.code}
              onChange={handleChange}
              disabled={disableForm}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center font-mono text-2xl tracking-[0.5em] text-slate-900 placeholder:text-slate-300 placeholder:tracking-[0.5em] focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the 6-digit code from your login email
            </p>
          </div>
        )}

        {/* Helper text for magic link method */}
        {method === 'email' && !success && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            We&apos;ll send you a magic link and a 6-digit code you can use to sign in.
          </p>
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
              : method === 'code'
              ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30"
              : "bg-sky-500 hover:bg-sky-400 shadow-sky-500/30"
          )}
        >
          {isSubmitting 
            ? (method === 'email' ? 'Sending…' : method === 'code' ? 'Verifying…' : 'Signing in…') 
            : (method === 'email' ? 'Send Magic Link' : method === 'code' ? 'Sign in with Code' : 'Sign in')
          }
        </button>
      </form>

      {/* Quick link to request new code when in code mode */}
      {method === 'code' && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => switchToMethod('email')}
            className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Need a new code? <span className="text-sky-600 dark:text-sky-400">Request new login email</span>
          </button>
        </div>
      )}
    </div>
  );
}
