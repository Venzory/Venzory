import Link from 'next/link';

import { getAuthService } from '@/src/services';
import { AcceptInviteForm } from '@/components/auth/accept-invite-form';

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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-white">Join {invite?.practice.name || 'Practice'}</h1>
          {isValidInvite ? (
            <p className="text-sm text-slate-300">
              You&apos;ve been invited to join as a <span className="font-medium">{invite?.role.toLowerCase()}</span>.
              Set up your account below.
            </p>
          ) : (
            <p className="text-sm text-slate-300">
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
            <div className="rounded-lg border border-rose-800 bg-rose-900/30 p-4">
              <p className="text-sm text-rose-300">
                This invitation link is invalid, has expired, or has already been used.
                Invitation links are valid for 7 days.
              </p>
            </div>

            <div className="space-y-3 text-center">
              <p className="text-sm text-slate-400">
                If you believe this is an error, please contact the person who invited you.
              </p>
              <Link
                href="/login"
                className="block text-sm text-sky-400 hover:text-sky-300"
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

