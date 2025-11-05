import type { PracticeRole } from '@prisma/client';

import type { SessionPractice } from '@/types/next-auth';

const rolePriority: Record<PracticeRole, number> = {
  ADMIN: 3,
  STAFF: 2,
  VIEWER: 1,
};

export function hasRole({
  memberships,
  practiceId,
  minimumRole,
}: {
  memberships: SessionPractice[];
  practiceId: string;
  minimumRole: PracticeRole;
}) {
  const membership = memberships.find((m) => m.practiceId === practiceId);
  if (!membership) {
    return false;
  }

  return rolePriority[membership.role] >= rolePriority[minimumRole];
}

export function findMembership({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return memberships.find((membership) => membership.practiceId === practiceId) ?? null;
}

