import { auth } from '@/auth';
import { cookies } from 'next/headers';

// Cookie name for active practice (must match switch-practice route and context-builder)
const ACTIVE_PRACTICE_COOKIE = 'venzory-active-practice';

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

/**
 * @deprecated Use `getCurrentPracticeContext()` from `@/src/lib/context/context-builder` instead.
 * This function reads from session only. The new helper reads from cookies first for persistence.
 */
export async function getActivePracticeId() {
  const session = await auth();
  return session?.user?.activePracticeId ?? null;
}

/**
 * @deprecated Use `getCurrentPracticeContext()` from `@/src/lib/context/context-builder` instead.
 * 
 * This function is kept for backwards compatibility. It now uses the same cookie-aware
 * practice resolution as `getCurrentPracticeContext()` but returns in the legacy format.
 * 
 * Migration: Replace `await requireActivePractice()` with:
 * ```typescript
 * import { getCurrentPracticeContext } from '@/src/lib/context/context-builder';
 * const ctx = await getCurrentPracticeContext();
 * // ctx.practiceId, ctx.userId, ctx.role, etc.
 * ```
 */
export async function requireActivePractice() {
  const session = await requireSession();
  const memberships = session.user.memberships ?? [];

  // Read practice from cookie as primary source (matches getCurrentPracticeContext behavior)
  let practiceId: string | null = null;
  
  try {
    const cookieStore = await cookies();
    const practiceCookie = cookieStore.get(ACTIVE_PRACTICE_COOKIE);
    if (practiceCookie?.value) {
      // Validate that user has active membership for this practice
      const cookieMembership = memberships.find(
        (m) => m.practiceId === practiceCookie.value && m.status === 'ACTIVE'
      );
      if (cookieMembership) {
        practiceId = practiceCookie.value;
      }
    }
  } catch {
    // cookies() might fail in non-request contexts
  }

  // Fallback to session or first membership
  if (!practiceId) {
    practiceId = session.user.activePracticeId ?? memberships[0]?.practiceId ?? null;
  }

  if (!practiceId) {
    throw new Error('No active practice in session');
  }

  return {
    session,
    practiceId,
  };
}

