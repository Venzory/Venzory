import type { PracticeRole } from '@prisma/client';
import type { Session } from 'next-auth';

import { hasRole } from '@/lib/rbac';

export type RouteRequirement = {
  path: string;
  minimumRole: PracticeRole;
};

// Define route requirements for role-based access control
export const ROUTE_REQUIREMENTS: RouteRequirement[] = [
  { path: '/settings', minimumRole: 'ADMIN' },
  // Other dashboard routes require at least VIEWER role (read-only)
  // Write operations are enforced at the action/component level
];

/**
 * Check if a user's session has the required role for a given route
 */
export function checkRouteAccess({
  pathname,
  session,
}: {
  pathname: string;
  session: Session | null;
}): { allowed: boolean; requirement?: RouteRequirement } {
  if (!session?.user) {
    return { allowed: false };
  }

  const activePracticeId = session.user.activePracticeId;
  if (!activePracticeId) {
    return { allowed: false };
  }

  // Find matching route requirement
  const requirement = ROUTE_REQUIREMENTS.find((req) => pathname.startsWith(req.path));

  // If no specific requirement, allow access (authenticated users can access)
  if (!requirement) {
    return { allowed: true };
  }

  // Check if user has required role
  const allowed = hasRole({
    memberships: session.user.memberships,
    practiceId: activePracticeId,
    minimumRole: requirement.minimumRole,
  });

  return { allowed, requirement };
}

