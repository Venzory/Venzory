/**
 * Context Builder
 * Builds RequestContext from Next.js session
 */

import type { Session } from 'next-auth';
import { auth } from '@/auth';
import { cookies } from 'next/headers';
import { UnauthorizedError, ForbiddenError } from '@/src/domain/errors';
import type { RequestContext, ContextPracticeMembership, PlatformAdminContext } from './request-context';
import { ROLE_PRIORITY, PLATFORM_ROLE_PRIORITY } from './request-context';
import { getPlatformAdmin, getPlatformAdminByUserId, isPlatformOwnerEnv } from '@/lib/owner-guard';
import type { PlatformRole } from '@prisma/client';
import { randomUUID } from 'crypto';

// Cookie names for storing active context (must match switch-practice/switch-location routes)
const ACTIVE_PRACTICE_COOKIE = 'venzory-active-practice';
const ACTIVE_LOCATION_COOKIE = 'venzory-active-location';

/**
 * Get the current practice context from cookies and session.
 * This is the primary server-side helper for resolving practice context.
 * 
 * Priority for practice selection:
 * 1. HTTP-only cookie (validated against memberships)
 * 2. Session activePracticeId
 * 3. First active membership
 * 
 * @param requestId - Optional request ID for tracing
 * @returns RequestContext with current user, practice, and location
 * @throws UnauthorizedError if no session
 * @throws ForbiddenError if no valid practice membership
 */
export async function getCurrentPracticeContext(
  requestId?: string
): Promise<RequestContext> {
  const session = await auth();

  if (!session?.user) {
    throw new UnauthorizedError('No active session');
  }

  const user = session.user;
  const memberships = user.memberships ?? [];

  // Read practice from cookie as primary source
  let practiceId: string | null = null;
  let locationId: string | null = null;
  
  try {
    const cookieStore = await cookies();
    
    // Read practice cookie and validate against memberships
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
    
    // Read location cookie (will be validated after practice is determined)
    const locationCookie = cookieStore.get(ACTIVE_LOCATION_COOKIE);
    if (locationCookie?.value) {
      locationId = locationCookie.value;
    }
  } catch {
    // cookies() might fail in non-request contexts
  }

  // Fallback to session or first membership if cookie invalid/missing
  if (!practiceId) {
    practiceId = user.activePracticeId ?? memberships[0]?.practiceId ?? null;
  }

  if (!practiceId) {
    throw new ForbiddenError('No active practice');
  }

  const activeMembership = memberships.find((m) => m.practiceId === practiceId);

  if (!activeMembership) {
    throw new ForbiddenError('User is not a member of the active practice');
  }

  // Get location data from session
  const allowedLocationIds = activeMembership.allowedLocationIds ?? [];
  
  // Validate location cookie against allowed locations
  if (locationId && !allowedLocationIds.includes(locationId)) {
    locationId = null; // Invalid location, will fall back below
  }
  
  // Fall back to first allowed location if no valid location
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
 * @deprecated Use `getCurrentPracticeContext()` instead.
 * This alias is kept for backwards compatibility.
 */
export const buildRequestContext = getCurrentPracticeContext;

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
 * Get optional practice context (returns null if no session or no practice)
 * Useful for optional authentication scenarios
 */
export async function getOptionalPracticeContext(
  requestId?: string
): Promise<RequestContext | null> {
  try {
    return await getCurrentPracticeContext(requestId);
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return null;
    }
    throw error;
  }
}

/**
 * @deprecated Use `getOptionalPracticeContext()` instead.
 */
export const buildOptionalRequestContext = getOptionalPracticeContext;

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

// ============================================
// PLATFORM ADMIN CONTEXT BUILDERS
// ============================================

/**
 * Build PlatformAdminContext from current session.
 * Used for Admin Console and Owner Portal routes.
 * Does NOT require a practice membership.
 */
export async function buildAdminContext(
  requestId?: string
): Promise<PlatformAdminContext> {
  const session = await auth();

  if (!session?.user) {
    throw new UnauthorizedError('No active session');
  }

  const user = session.user;
  const email = user.email;

  if (!email) {
    throw new UnauthorizedError('No email associated with session');
  }

  // Check database for platform admin
  const adminRecord = await getPlatformAdmin(email);

  if (adminRecord) {
    return {
      userId: user.id,
      userEmail: email,
      userName: user.name ?? null,
      platformRole: adminRecord.role,
      platformAdminId: adminRecord.id,
      timestamp: new Date(),
      requestId: requestId ?? randomUUID(),
    };
  }

  // Fallback: check env variable for platform owner
  if (isPlatformOwnerEnv(email)) {
    return {
      userId: user.id,
      userEmail: email,
      userName: user.name ?? null,
      platformRole: 'PLATFORM_OWNER',
      platformAdminId: 'env-fallback', // Indicates env-based auth
      timestamp: new Date(),
      requestId: requestId ?? randomUUID(),
    };
  }

  throw new ForbiddenError('User is not a platform administrator');
}

/**
 * Build optional PlatformAdminContext (returns null if not admin)
 */
export async function buildOptionalAdminContext(
  requestId?: string
): Promise<PlatformAdminContext | null> {
  try {
    return await buildAdminContext(requestId);
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return null;
    }
    throw error;
  }
}

/**
 * Validate that admin context has required platform role.
 * Throws ForbiddenError if insufficient permissions.
 */
export function requirePlatformRole(
  ctx: PlatformAdminContext,
  minimumRole: PlatformRole
): void {
  if (PLATFORM_ROLE_PRIORITY[ctx.platformRole] < PLATFORM_ROLE_PRIORITY[minimumRole]) {
    throw new ForbiddenError(
      `Insufficient platform permissions. Required: ${minimumRole}, Has: ${ctx.platformRole}`
    );
  }
}

/**
 * Require PLATFORM_OWNER role (Owner Portal access)
 */
export function requirePlatformOwner(ctx: PlatformAdminContext): void {
  requirePlatformRole(ctx, 'PLATFORM_OWNER');
}

/**
 * Check if admin context has Owner Portal access
 */
export function hasOwnerAccess(ctx: PlatformAdminContext): boolean {
  return ctx.platformRole === 'PLATFORM_OWNER';
}

/**
 * Check if admin context has Admin Console access
 * Both PLATFORM_OWNER and DATA_STEWARD have Admin Console access
 */
export function hasAdminAccess(ctx: PlatformAdminContext): boolean {
  return ctx.platformRole === 'PLATFORM_OWNER' || ctx.platformRole === 'DATA_STEWARD';
}

