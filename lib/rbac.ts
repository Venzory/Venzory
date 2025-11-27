import type { PracticeRole } from '@prisma/client';

import type { SessionPractice } from '@/types/next-auth';

/**
 * Role priority for permission checks (higher = more permissions)
 * OWNER: Full control including org deletion and billing
 * ADMIN: Full management access
 * MANAGER: Team lead, can manage staff in assigned locations
 * STAFF: Day-to-day operations in assigned locations
 */
export const rolePriority: Record<PracticeRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MANAGER: 2,
  STAFF: 1,
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

/**
 * Check if user has access to a specific location
 * OWNER and ADMIN have access to all locations
 * MANAGER and STAFF need explicit location assignment
 */
export function hasLocationAccess({
  memberships,
  practiceId,
  locationId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
  locationId: string;
}) {
  const membership = findMembership({ memberships, practiceId });
  if (!membership) {
    return false;
  }

  // OWNER and ADMIN have access to all locations
  if (membership.role === 'OWNER' || membership.role === 'ADMIN') {
    return true;
  }

  // MANAGER and STAFF need explicit location assignment
  return membership.allowedLocationIds?.includes(locationId) ?? false;
}

/**
 * Get all location IDs the user can access
 * Returns null for OWNER/ADMIN (meaning all locations)
 */
export function getAllowedLocationIds({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}): string[] | null {
  const membership = findMembership({ memberships, practiceId });
  if (!membership) {
    return [];
  }

  // OWNER and ADMIN have access to all locations
  if (membership.role === 'OWNER' || membership.role === 'ADMIN') {
    return null; // null = all locations
  }

  return membership.allowedLocationIds ?? [];
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
  return hasRole({ memberships, practiceId, minimumRole: 'STAFF' });
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

// OWNER-specific permissions
export function canDeleteOrganization({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'OWNER' });
}

export function canManageBilling({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'OWNER' });
}

export function canTransferOwnership({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'OWNER' });
}

// MANAGER-specific permissions
export function canManageTeamMembers({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'MANAGER' });
}

export function canAssignLocations({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  return hasRole({ memberships, practiceId, minimumRole: 'ADMIN' });
}

/**
 * Check if user is the organization owner
 */
export function isOrganizationOwner({
  memberships,
  practiceId,
}: {
  memberships: SessionPractice[];
  practiceId: string;
}) {
  const membership = findMembership({ memberships, practiceId });
  return membership?.role === 'OWNER';
}

