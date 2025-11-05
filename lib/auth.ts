import { auth } from '@/auth';

export async function getSession() {
  return auth();
}

export async function requireSession() {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function getActivePracticeId() {
  const session = await auth();
  return session?.user?.activePracticeId ?? null;
}

export async function requireActivePractice() {
  const session = await requireSession();
  const memberships = session.user.memberships ?? [];
  const practiceId = session.user.activePracticeId ?? memberships[0]?.practiceId ?? null;

  if (!practiceId) {
    throw new Error('No active practice in session');
  }

  return {
    session,
    practiceId,
  };
}

