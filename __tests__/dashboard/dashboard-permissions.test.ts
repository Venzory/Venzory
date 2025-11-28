import { describe, it, expect } from 'vitest';
import { PracticeRole, MembershipStatus } from '@prisma/client';
import { hasRole } from '@/lib/rbac';
import type { SessionPractice } from '@/types/next-auth';

// Helper to create a valid SessionPractice object
function createMembership(
  id: string,
  practiceId: string,
  role: PracticeRole,
  practiceName = 'Test Practice',
  practiceSlug = 'test-practice'
): SessionPractice {
  return {
    id,
    practiceId,
    role,
    status: MembershipStatus.ACTIVE,
    practice: {
      id: practiceId,
      name: practiceName,
      slug: practiceSlug,
      onboardingCompletedAt: null,
      onboardingSkippedAt: null,
    },
    allowedLocationIds: [],
    locations: [],
  };
}

describe('Dashboard Permissions', () => {
  const practiceId = 'practice-123';

  describe('canManage check (STAFF minimum role)', () => {
    it('should return true for OWNER role', () => {
      const memberships: SessionPractice[] = [
        createMembership('membership-0', practiceId, PracticeRole.OWNER),
      ];

      const canManage = hasRole({
        memberships,
        practiceId,
        minimumRole: PracticeRole.STAFF,
      });

      expect(canManage).toBe(true);
    });

    it('should return true for ADMIN role', () => {
      const memberships: SessionPractice[] = [
        createMembership('membership-1', practiceId, PracticeRole.ADMIN),
      ];

      const canManage = hasRole({
        memberships,
        practiceId,
        minimumRole: PracticeRole.STAFF,
      });

      expect(canManage).toBe(true);
    });

    it('should return true for MANAGER role', () => {
      const memberships: SessionPractice[] = [
        createMembership('membership-2', practiceId, PracticeRole.MANAGER),
      ];

      const canManage = hasRole({
        memberships,
        practiceId,
        minimumRole: PracticeRole.STAFF,
      });

      expect(canManage).toBe(true);
    });

    it('should return true for STAFF role', () => {
      const memberships: SessionPractice[] = [
        createMembership('membership-3', practiceId, PracticeRole.STAFF),
      ];

      const canManage = hasRole({
        memberships,
        practiceId,
        minimumRole: PracticeRole.STAFF,
      });

      expect(canManage).toBe(true);
    });

    it('should return false when user has no membership for the practice', () => {
      const memberships: SessionPractice[] = [
        createMembership('membership-4', 'different-practice-456', PracticeRole.ADMIN, 'Other Practice', 'other-practice'),
      ];

      const canManage = hasRole({
        memberships,
        practiceId,
        minimumRole: PracticeRole.STAFF,
      });

      expect(canManage).toBe(false);
    });

    it('should return false for empty memberships array', () => {
      const memberships: SessionPractice[] = [];

      const canManage = hasRole({
        memberships,
        practiceId,
        minimumRole: PracticeRole.STAFF,
      });

      expect(canManage).toBe(false);
    });
  });

  describe('Dashboard CTA visibility rules', () => {
    it('ADMIN and STAFF should see interactive KPI links', () => {
      const adminMemberships: SessionPractice[] = [
        createMembership('membership-5', practiceId, PracticeRole.ADMIN, 'Test', 'test'),
      ];
      const staffMemberships: SessionPractice[] = [
        createMembership('membership-6', practiceId, PracticeRole.STAFF, 'Test', 'test'),
      ];

      expect(
        hasRole({ memberships: adminMemberships, practiceId, minimumRole: PracticeRole.STAFF })
      ).toBe(true);
      expect(
        hasRole({ memberships: staffMemberships, practiceId, minimumRole: PracticeRole.STAFF })
      ).toBe(true);
    });

    it('ADMIN and STAFF should see Order buttons in low-stock widget', () => {
      const adminMemberships: SessionPractice[] = [
        createMembership('membership-8', practiceId, PracticeRole.ADMIN, 'Test', 'test'),
      ];
      const staffMemberships: SessionPractice[] = [
        createMembership('membership-9', practiceId, PracticeRole.STAFF, 'Test', 'test'),
      ];

      expect(
        hasRole({ memberships: adminMemberships, practiceId, minimumRole: PracticeRole.STAFF })
      ).toBe(true);
      expect(
        hasRole({ memberships: staffMemberships, practiceId, minimumRole: PracticeRole.STAFF })
      ).toBe(true);
    });

    it('OWNER should have highest permissions', () => {
      const ownerMemberships: SessionPractice[] = [
        createMembership('membership-11', practiceId, PracticeRole.OWNER, 'Test', 'test'),
      ];

      expect(
        hasRole({ memberships: ownerMemberships, practiceId, minimumRole: PracticeRole.ADMIN })
      ).toBe(true);
      expect(
        hasRole({ memberships: ownerMemberships, practiceId, minimumRole: PracticeRole.STAFF })
      ).toBe(true);
    });

    it('MANAGER should have more permissions than STAFF', () => {
      const managerMemberships: SessionPractice[] = [
        createMembership('membership-12', practiceId, PracticeRole.MANAGER, 'Test', 'test'),
      ];

      expect(
        hasRole({ memberships: managerMemberships, practiceId, minimumRole: PracticeRole.STAFF })
      ).toBe(true);
      expect(
        hasRole({ memberships: managerMemberships, practiceId, minimumRole: PracticeRole.MANAGER })
      ).toBe(true);
    });
  });
});
