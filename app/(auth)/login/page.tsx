import Link from 'next/link';
import { Suspense } from 'react';

import { LoginForm } from '@/components/auth/login-form';

export const metadata = {
  title: 'Sign in',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900/60">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Sign in to Venzory</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Use your work email to access the dashboard. New practice?{' '}
            <Link href="/register" className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
              Create an account
            </Link>
            .
          </p>
        </header>
        <Suspense fallback={<div className="text-center text-slate-600 dark:text-slate-400">Loading...</div>}>
          <LoginForm />
        </Suspense>
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          No account yet?{' '}
          <Link href="/register" className="hover:underline">
            Sign up
          </Link>
        </p>
        <p className="text-center text-xs text-slate-500">
          By continuing you agree to store data in accordance with your practice policies.
        </p>
      </div>
    </div>
  );
}

