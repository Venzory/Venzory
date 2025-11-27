/**
 * Request Context
 * Carries user identity, practice, location, and authorization information through the request lifecycle
 * Mirrors the context.Context pattern from Go
 */

import type { PracticeRole, MembershipStatus } from '@prisma/client';

/**
 * Practice membership information in context
 */
export interface ContextPracticeMembership {
  practiceId: string;
  role: PracticeRole;
  status: MembershipStatus;
  allowedLocationIds: string[];
}

/**
 * Request context carrying user identity and authorization
 */
export interface RequestContext {
  /**
   * User ID making the request
   */
  userId: string;

  /**
   * User email
   */
  userEmail: string;

  /**
   * User name (may be null)
   */
  userName: string | null;

  /**
   * Active practice ID for this request
   */
  practiceId: string;

  /**
   * Active location ID for this request (null = all allowed locations)
   */
  locationId: string | null;

  /**
   * Location IDs the user can access in the active practice
   */
  allowedLocationIds: string[];

  /**
   * User's role in the active practice
   */
  role: PracticeRole;

  /**
   * All practice memberships for the user
   */
  memberships: ContextPracticeMembership[];

  /**
   * Request timestamp
   */
  timestamp: Date;

  /**
   * Optional request ID for tracing
   */
  requestId?: string;

  /**
   * Optional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Role priority for permission checks (higher = more permissions)
 */
export const ROLE_PRIORITY: Record<PracticeRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MANAGER: 2,
  STAFF: 1,
};

/**
 * Check if user has required role in the active practice
 */
export function hasRequiredRole(ctx: RequestContext, minimumRole: PracticeRole): boolean {
  return ROLE_PRIORITY[ctx.role] >= ROLE_PRIORITY[minimumRole];
}

/**
 * Check if user has access to a specific practice
 */
export function hasPracticeAccess(ctx: RequestContext, practiceId: string): boolean {
  return ctx.memberships.some(
    (m) => m.practiceId === practiceId && m.status === 'ACTIVE'
  );
}

/**
 * Check if user has access to a specific location
 */
export function hasLocationAccess(ctx: RequestContext, locationId: string): boolean {
  // OWNER and ADMIN have access to all locations
  if (ctx.role === 'OWNER' || ctx.role === 'ADMIN') {
    return true;
  }
  return ctx.allowedLocationIds.includes(locationId);
}

/**
 * Check if a location ID is within the user's allowed locations
 * Returns the locationId if allowed, or null if not
 */
export function validateLocationAccess(ctx: RequestContext, locationId: string | null): string | null {
  if (!locationId) {
    return null;
  }
  return hasLocationAccess(ctx, locationId) ? locationId : null;
}

/**
 * Get the effective location IDs for scoping queries
 * Returns null if user has access to all locations (for OWNER/ADMIN)
 */
export function getEffectiveLocationScope(ctx: RequestContext): string[] | null {
  // OWNER and ADMIN see all locations - return null to skip location filtering
  if (ctx.role === 'OWNER' || ctx.role === 'ADMIN') {
    return null;
  }
  return ctx.allowedLocationIds;
}

/**
 * Get user's role in a specific practice
 */
export function getRoleInPractice(
  ctx: RequestContext,
  practiceId: string
): PracticeRole | null {
  const membership = ctx.memberships.find(
    (m) => m.practiceId === practiceId && m.status === 'ACTIVE'
  );
  return membership?.role ?? null;
}

/**
 * Create a partial context for testing
 */
export function createTestContext(overrides: Partial<RequestContext> = {}): RequestContext {
  const defaultLocationId = 'test-location-id';
  return {
    userId: overrides.userId ?? 'test-user-id',
    userEmail: overrides.userEmail ?? 'test@example.com',
    userName: overrides.userName ?? 'Test User',
    practiceId: overrides.practiceId ?? 'test-practice-id',
    locationId: overrides.locationId ?? defaultLocationId,
    allowedLocationIds: overrides.allowedLocationIds ?? [defaultLocationId],
    role: overrides.role ?? 'ADMIN',
    memberships: overrides.memberships ?? [
      {
        practiceId: overrides.practiceId ?? 'test-practice-id',
        role: overrides.role ?? 'ADMIN',
        status: 'ACTIVE',
        allowedLocationIds: overrides.allowedLocationIds ?? [defaultLocationId],
      },
    ],
    timestamp: overrides.timestamp ?? new Date(),
    requestId: overrides.requestId,
    metadata: overrides.metadata,
  };
}

