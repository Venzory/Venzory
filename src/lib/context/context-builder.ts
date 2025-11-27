/**
 * Context Builder
 * Builds RequestContext from Next.js session
 */

import type { Session } from 'next-auth';
import { auth } from '@/auth';
import { cookies } from 'next/headers';
import { UnauthorizedError, ForbiddenError } from '@/src/domain/errors';
import type { RequestContext, ContextPracticeMembership } from './request-context';
import { ROLE_PRIORITY } from './request-context';
import { randomUUID } from 'crypto';

// Cookie name for storing active location (must match switch-location route)
const ACTIVE_LOCATION_COOKIE = 'venzory-active-location';

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

  // Get location data from session
  const allowedLocationIds = activeMembership.allowedLocationIds ?? [];
  
  // Read active location from cookie (set by switch-location API)
  let locationId: string | null = null;
  try {
    const cookieStore = await cookies();
    const locationCookie = cookieStore.get(ACTIVE_LOCATION_COOKIE);
    if (locationCookie?.value && allowedLocationIds.includes(locationCookie.value)) {
      locationId = locationCookie.value;
    }
  } catch {
    // cookies() might fail in non-request contexts, fall back to first allowed
  }
  
  // Fall back to first allowed location if no valid cookie
  if (!locationId && allowedLocationIds.length > 0) {
    locationId = allowedLocationIds[0];
  }

  return {
    userId: user.id,
    userEmail: user.email!,
    userName: user.name ?? null,
    practiceId,
    locationId,
    allowedLocationIds,
    role: activeMembership.role,
    memberships: memberships.map((m) => ({
      practiceId: m.practiceId,
      role: m.role,
      status: m.status,
      allowedLocationIds: m.allowedLocationIds ?? [],
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

  // Get location data from session
  const allowedLocationIds = activeMembership.allowedLocationIds ?? [];
  const locationId = user.activeLocationId ?? allowedLocationIds[0] ?? null;

  return {
    userId: user.id,
    userEmail: user.email!,
    userName: user.name ?? null,
    practiceId,
    locationId,
    allowedLocationIds,
    role: activeMembership.role,
    memberships: memberships.map((m) => ({
      practiceId: m.practiceId,
      role: m.role,
      status: m.status,
      allowedLocationIds: m.allowedLocationIds ?? [],
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
  minimumRole: 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF'
): void {
  if (ROLE_PRIORITY[ctx.role] < ROLE_PRIORITY[minimumRole]) {
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

/**
 * Validate that context has access to specific location
 * Throws ForbiddenError if no access
 * OWNER and ADMIN roles have access to all locations
 */
export function requireLocationAccess(
  ctx: RequestContext,
  locationId: string
): void {
  // OWNER and ADMIN have full location access
  if (ctx.role === 'OWNER' || ctx.role === 'ADMIN') {
    return;
  }

  if (!ctx.allowedLocationIds.includes(locationId)) {
    throw new ForbiddenError('No access to this location');
  }
}

