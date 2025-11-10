import Link from 'next/link';

import { prisma } from '@/lib/prisma';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata = {
  title: 'Reset Password',
};

interface ResetPasswordPageProps {
  params: Promise<{ token: string }>;
}

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { token } = await params;

  // Validate token (using prisma directly for now as this is just validation)
  // This could be moved to AuthService if we want a dedicated validateResetToken method
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  const isValidToken =
    resetToken &&
    !resetToken.used &&
    new Date() <= resetToken.expiresAt;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-white">Reset your password</h1>
          {isValidToken ? (
            <p className="text-sm text-slate-300">
              Enter your new password below.
            </p>
          ) : (
            <p className="text-sm text-slate-300">
              This password reset link is invalid or has expired.
            </p>
          )}
        </header>

        {isValidToken ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-rose-800 bg-rose-900/30 p-4">
              <p className="text-sm text-rose-300">
                This password reset link is invalid, has expired, or has already been used.
                Password reset links are valid for 60 minutes.
              </p>
            </div>

            <div className="space-y-3 text-center">
              <Link
                href="/forgot-password"
                className="block text-sm text-sky-400 hover:text-sky-300"
              >
                Request a new password reset link
              </Link>
              <Link
                href="/login"
                className="block text-sm text-slate-400 hover:text-slate-300"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-500">
          Having trouble? Contact your practice administrator for assistance.
        </p>
      </div>
    </div>
  );
}

