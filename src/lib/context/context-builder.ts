/**
 * Context Builder
 * Builds RequestContext from Next.js session
 */

import type { Session } from 'next-auth';
import { auth } from '@/auth';
import { UnauthorizedError, ForbiddenError } from '@/src/domain/errors';
import type { RequestContext, ContextPracticeMembership } from './request-context';
import { randomUUID } from 'crypto';

/**
 * Build RequestContext from current session
 * Requires authenticated user with active practice
 */
export async function buildRequestContext(
  requestId?: string
): Promise<RequestContext> {
  const session = await auth();

  if (!session?.user) {
    throw new UnauthorizedError('No active session');
  }

  const user = session.user;
  const memberships = user.memberships ?? [];
  const practiceId = user.activePracticeId ?? memberships[0]?.practiceId;

  if (!practiceId) {
    throw new ForbiddenError('No active practice');
  }

  const activeMembership = memberships.find((m) => m.practiceId === practiceId);

  if (!activeMembership) {
    throw new ForbiddenError('User is not a member of the active practice');
  }

  return {
    userId: user.id,
    userEmail: user.email!,
    userName: user.name ?? null,
    practiceId,
    role: activeMembership.role,
    memberships: memberships.map((m) => ({
      practiceId: m.practiceId,
      role: m.role,
      status: m.status,
    })),
    timestamp: new Date(),
    requestId: requestId ?? randomUUID(),
  };
}

/**
 * Build RequestContext from explicit session object
 * Useful when session is already available
 */
export function buildRequestContextFromSession(
  session: Session,
  requestId?: string
): RequestContext {
  if (!session?.user) {
    throw new UnauthorizedError('Invalid session');
  }

  const user = session.user;
  const memberships = user.memberships ?? [];
  const practiceId = user.activePracticeId ?? memberships[0]?.practiceId;

  if (!practiceId) {
    throw new ForbiddenError('No active practice');
  }

  const activeMembership = memberships.find((m) => m.practiceId === practiceId);

  if (!activeMembership) {
    throw new ForbiddenError('User is not a member of the active practice');
  }

  return {
    userId: user.id,
    userEmail: user.email!,
    userName: user.name ?? null,
    practiceId,
    role: activeMembership.role,
    memberships: memberships.map((m) => ({
      practiceId: m.practiceId,
      role: m.role,
      status: m.status,
    })),
    timestamp: new Date(),
    requestId: requestId ?? randomUUID(),
  };
}

/**
 * Build optional RequestContext (returns null if no session)
 * Useful for optional authentication scenarios
 */
export async function buildOptionalRequestContext(
  requestId?: string
): Promise<RequestContext | null> {
  try {
    return await buildRequestContext(requestId);
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return null;
    }
    throw error;
  }
}

/**
 * Validate that context has required role
 * Throws ForbiddenError if insufficient permissions
 */
export function requireRole(
  ctx: RequestContext,
  minimumRole: 'ADMIN' | 'STAFF' | 'VIEWER'
): void {
  const rolePriority = {
    ADMIN: 3,
    STAFF: 2,
    VIEWER: 1,
  };

  if (rolePriority[ctx.role] < rolePriority[minimumRole]) {
    throw new ForbiddenError(
      `Insufficient permissions. Required: ${minimumRole}, Has: ${ctx.role}`
    );
  }
}

/**
 * Validate that context has access to specific practice
 * Throws ForbiddenError if no access
 */
export function requirePracticeAccess(
  ctx: RequestContext,
  practiceId: string
): void {
  const hasAccess = ctx.memberships.some(
    (m) => m.practiceId === practiceId && m.status === 'ACTIVE'
  );

  if (!hasAccess) {
    throw new ForbiddenError('No access to this practice');
  }
}

