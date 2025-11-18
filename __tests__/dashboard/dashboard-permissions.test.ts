import { describe, it, expect } from 'vitest';
import { PracticeRole, MembershipStatus } from '@prisma/client';
import { hasRole } from '@/lib/rbac';
import type { SessionPractice } from '@/types/next-auth';

describe('Dashboard Permissions', () => {
  const practiceId = 'practice-123';

  describe('canManage check (STAFF minimum role)', () => {
    it('should return true for ADMIN role', () => {
      const memberships: SessionPractice[] = [
        {
          id: 'membership-1',
          practiceId,
          role: PracticeRole.ADMIN,
          status: MembershipStatus.ACTIVE,
          practice: {
            id: practiceId,
            name: 'Test Practice',
            slug: 'test-practice',
          },
        },
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
        {
          id: 'membership-2',
          practiceId,
          role: PracticeRole.STAFF,
          status: MembershipStatus.ACTIVE,
          practice: {
            id: practiceId,
            name: 'Test Practice',
            slug: 'test-practice',
          },
        },
      ];

      const canManage = hasRole({
        memberships,
        practiceId,
        minimumRole: PracticeRole.STAFF,
      });

      expect(canManage).toBe(true);
    });

    it('should return false for VIEWER role', () => {
      const memberships: SessionPractice[] = [
        {
          id: 'membership-3',
          practiceId,
          role: PracticeRole.VIEWER,
          status: MembershipStatus.ACTIVE,
          practice: {
            id: practiceId,
            name: 'Test Practice',
            slug: 'test-practice',
          },
        },
      ];

      const canManage = hasRole({
        memberships,
        practiceId,
        minimumRole: PracticeRole.STAFF,
      });

      expect(canManage).toBe(false);
    });

    it('should return false when user has no membership for the practice', () => {
      const memberships: SessionPractice[] = [
        {
          id: 'membership-4',
          practiceId: 'different-practice-456',
          role: PracticeRole.ADMIN,
          status: MembershipStatus.ACTIVE,
          practice: {
            id: 'different-practice-456',
            name: 'Other Practice',
            slug: 'other-practice',
          },
        },
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
        {
          id: 'membership-5',
          practiceId,
          role: PracticeRole.ADMIN,
          status: MembershipStatus.ACTIVE,
          practice: { id: practiceId, name: 'Test', slug: 'test' },
        },
      ];
      const staffMemberships: SessionPractice[] = [
        {
          id: 'membership-6',
          practiceId,
          role: PracticeRole.STAFF,
          status: MembershipStatus.ACTIVE,
          practice: { id: practiceId, name: 'Test', slug: 'test' },
        },
      ];

      expect(
        hasRole({ memberships: adminMemberships, practiceId, minimumRole: PracticeRole.STAFF })
      ).toBe(true);
      expect(
        hasRole({ memberships: staffMemberships, practiceId, minimumRole: PracticeRole.STAFF })
      ).toBe(true);
    });

    it('VIEWER should NOT see interactive KPI links', () => {
      const viewerMemberships: SessionPractice[] = [
        {
          id: 'membership-7',
          practiceId,
          role: PracticeRole.VIEWER,
          status: MembershipStatus.ACTIVE,
          practice: { id: practiceId, name: 'Test', slug: 'test' },
        },
      ];

      expect(
        hasRole({ memberships: viewerMemberships, practiceId, minimumRole: PracticeRole.STAFF })
      ).toBe(false);
    });

    it('ADMIN and STAFF should see Order buttons in low-stock widget', () => {
      const adminMemberships: SessionPractice[] = [
        {
          id: 'membership-8',
          practiceId,
          role: PracticeRole.ADMIN,
          status: MembershipStatus.ACTIVE,
          practice: { id: practiceId, name: 'Test', slug: 'test' },
        },
      ];
      const staffMemberships: SessionPractice[] = [
        {
          id: 'membership-9',
          practiceId,
          role: PracticeRole.STAFF,
          status: MembershipStatus.ACTIVE,
          practice: { id: practiceId, name: 'Test', slug: 'test' },
        },
      ];

      expect(
        hasRole({ memberships: adminMemberships, practiceId, minimumRole: PracticeRole.STAFF })
      ).toBe(true);
      expect(
        hasRole({ memberships: staffMemberships, practiceId, minimumRole: PracticeRole.STAFF })
      ).toBe(true);
    });

    it('VIEWER should NOT see Order buttons in low-stock widget', () => {
      const viewerMemberships: SessionPractice[] = [
        {
          id: 'membership-10',
          practiceId,
          role: PracticeRole.VIEWER,
          status: MembershipStatus.ACTIVE,
          practice: { id: practiceId, name: 'Test', slug: 'test' },
        },
      ];

      expect(
        hasRole({ memberships: viewerMemberships, practiceId, minimumRole: PracticeRole.STAFF })
      ).toBe(false);
    });
  });
});

