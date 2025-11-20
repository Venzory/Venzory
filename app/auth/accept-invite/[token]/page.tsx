import Link from 'next/link';

import { getAuthService } from '@/src/services';
import { AcceptInviteForm } from '@/components/auth/accept-invite-form';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export const metadata = {
  title: 'Accept Invitation',
};

interface AcceptInvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function AcceptInvitePage({ params }: AcceptInvitePageProps) {
  const { token } = await params;

  // Validate token using AuthService
  let invite;
  let isValidInvite = false;
  try {
    invite = await getAuthService().validateInviteToken(token);
    isValidInvite = true;
  } catch (error) {
    // Token is invalid or expired
    invite = null;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12 dark:bg-slate-950">
      <div className="absolute right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900/60">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Join {invite?.practice.name || 'Practice'}</h1>
          {isValidInvite ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You&apos;ve been invited to join as a <span className="font-medium">{invite?.role.toLowerCase()}</span>.
              Set up your account below.
            </p>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This invitation link is invalid or has expired.
            </p>
          )}
        </header>

        {isValidInvite && invite ? (
          <AcceptInviteForm 
            token={token} 
            email={invite.email}
            practiceName={invite.practice?.name || 'Practice'}
            role={invite.role}
            inviterName={invite.inviterName}
          />
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-900/30">
              <p className="text-sm text-rose-600 dark:text-rose-300">
                This invitation link is invalid, has expired, or has already been used.
                Invitation links are valid for 7 days.
              </p>
            </div>

            <div className="space-y-3 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                If you believe this is an error, please contact the person who invited you.
              </p>
              <Link
                href="/login"
                className="block text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
              >
                Go to sign in
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
