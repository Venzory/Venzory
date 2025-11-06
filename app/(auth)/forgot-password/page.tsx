import Link from 'next/link';

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata = {
  title: 'Forgot Password',
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-white">Reset your password</h1>
          <p className="text-sm text-slate-300">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </header>

        <ForgotPasswordForm />

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-sky-400 hover:text-sky-300"
          >
            Back to sign in
          </Link>
        </div>

        <p className="text-center text-xs text-slate-500">
          Having trouble? Contact your practice administrator for assistance.
        </p>
      </div>
    </div>
  );
}

