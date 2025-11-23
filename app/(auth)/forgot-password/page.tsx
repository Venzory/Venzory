import Link from 'next/link';

import { auth } from '@/auth';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { SignOutButton } from '@/components/auth/sign-out-button';

export const metadata = {
  title: 'Forgot Password',
};

export default async function ForgotPasswordPage() {
  const session = await auth();
  const signedInEmail = session?.user?.email ?? null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900/60">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Reset your password</h1>
          {signedInEmail ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You&apos;re currently signed in as <span className="font-semibold text-slate-900 dark:text-white">{signedInEmail}</span>.
              Sign out first if you need to reset another account.
            </p>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          )}
        </header>

        {signedInEmail ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Need to keep working? Head back to your{' '}
              <Link href="/dashboard" className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
                dashboard
              </Link>
              . Otherwise, sign out below to reset a different account.
            </p>
            <SignOutButton className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:bg-slate-800 disabled:opacity-70" />
          </div>
        ) : (
          <>
            <ForgotPasswordForm />

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
              >
                Back to sign in
              </Link>
            </div>
          </>
        )}

        <p className="text-center text-xs text-slate-500">
          Having trouble? Contact your practice administrator for assistance.
        </p>
      </div>
    </div>
  );
}
