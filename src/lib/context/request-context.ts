/**
 * Request Context
 * Carries user identity, practice, and authorization information through the request lifecycle
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
 * Check if user has required role in the active practice
 */
export function hasRequiredRole(ctx: RequestContext, minimumRole: PracticeRole): boolean {
  const rolePriority: Record<PracticeRole, number> = {
    ADMIN: 3,
    STAFF: 2,
    VIEWER: 1,
  };

  return rolePriority[ctx.role] >= rolePriority[minimumRole];
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
  return {
    userId: overrides.userId ?? 'test-user-id',
    userEmail: overrides.userEmail ?? 'test@example.com',
    userName: overrides.userName ?? 'Test User',
    practiceId: overrides.practiceId ?? 'test-practice-id',
    role: overrides.role ?? 'ADMIN',
    memberships: overrides.memberships ?? [
      {
        practiceId: overrides.practiceId ?? 'test-practice-id',
        role: overrides.role ?? 'ADMIN',
        status: 'ACTIVE',
      },
    ],
    timestamp: overrides.timestamp ?? new Date(),
    requestId: overrides.requestId,
    metadata: overrides.metadata,
  };
}

