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

// Specific permission helpers
export function canManageUsers({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'ADMIN' });
}

export function canManagePracticeSettings({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'ADMIN' });
}

export function canEditInventory({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'STAFF' });
}

export function canEditSuppliers({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'STAFF' });
}

export function canPlaceOrders({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'STAFF' });
}

export function canDelete({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'STAFF' });
}

export function canView({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'VIEWER' });
}

export function canManageProducts({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'ADMIN' });
}

export function canViewProductPricing({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'STAFF' });
}

export function canReceiveGoods({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'STAFF' });
}

export function canPerformStockCount({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'STAFF' });
}

export function canDeleteReceipts({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'ADMIN' });
}

