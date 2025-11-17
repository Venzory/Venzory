/**
 * Settings Service Tests
 * Tests role enforcement, business rules, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsService } from '@/src/services/settings/settings-service';
import { UserRepository } from '@/src/repositories/users';
import { PracticeSupplierRepository } from '@/src/repositories/suppliers';
import { InventoryRepository } from '@/src/repositories/inventory';
import { OrderRepository } from '@/src/repositories/orders';
import { LocationRepository } from '@/src/repositories/locations';
import { AuditService } from '@/src/services/audit/audit-service';
import { createTestContext } from '@/src/lib/context/request-context';
import {
  ForbiddenError,
  BusinessRuleViolationError,
  NotFoundError,
} from '@/src/domain/errors';

describe('SettingsService', () => {
  let settingsService: SettingsService;
  let mockUserRepository: any;
  let mockPracticeSupplierRepository: any;
  let mockInventoryRepository: any;
  let mockOrderRepository: any;
  let mockLocationRepository: any;
  let mockAuditService: any;

  beforeEach(() => {
    // Create mock repositories
    mockUserRepository = {
      findPracticeById: vi.fn(),
      updatePractice: vi.fn(),
      generateUniquePracticeSlug: vi.fn(),
      findPracticeUserMembership: vi.fn(),
      updatePracticeUserRole: vi.fn(),
      countAdminsInPractice: vi.fn(),
      deletePracticeUserMembership: vi.fn(),
      findUserInviteById: vi.fn(),
      deleteUserInvite: vi.fn(),
      findPracticeUsersWithDetails: vi.fn(),
      findPendingInvites: vi.fn(),
    };

    mockPracticeSupplierRepository = {
      findPracticeSuppliers: vi.fn(),
    };
    mockInventoryRepository = {
      findItems: vi.fn(),
    };
    mockOrderRepository = {
      findOrders: vi.fn(),
    };
    mockLocationRepository = {
      findLocations: vi.fn(),
    };

    mockAuditService = {
      logPracticeSettingsUpdated: vi.fn(),
      logUserRoleUpdated: vi.fn(),
      logUserRemovedFromPractice: vi.fn(),
      logInviteCancelled: vi.fn(),
    };

    // Create service instance with mocks
    settingsService = new SettingsService(
      mockUserRepository as UserRepository,
      mockPracticeSupplierRepository as PracticeSupplierRepository,
      mockInventoryRepository as InventoryRepository,
      mockOrderRepository as OrderRepository,
      mockLocationRepository as LocationRepository,
      mockAuditService as AuditService
    );
  });

  describe('updatePracticeSettings', () => {
    it('should throw ForbiddenError when user is not ADMIN', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      await expect(
        settingsService.updatePracticeSettings(ctx, {
          name: 'Updated Practice',
        })
      ).rejects.toThrow(ForbiddenError);

      expect(mockUserRepository.findPracticeById).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user is VIEWER', async () => {
      const ctx = createTestContext({ role: 'VIEWER' });

      await expect(
        settingsService.updatePracticeSettings(ctx, {
          name: 'Updated Practice',
        })
      ).rejects.toThrow(ForbiddenError);

      expect(mockUserRepository.findPracticeById).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to update practice settings', async () => {
      const ctx = createTestContext({ role: 'ADMIN' });

      mockUserRepository.findPracticeById.mockResolvedValue({
        id: 'practice-1',
        name: 'Old Practice',
        slug: 'old-practice',
      });

      mockUserRepository.generateUniquePracticeSlug.mockResolvedValue('updated-practice');

      await settingsService.updatePracticeSettings(ctx, {
        name: 'Updated Practice',
        city: 'New City',
      });

      expect(mockUserRepository.findPracticeById).toHaveBeenCalledWith(
        ctx.practiceId,
        expect.anything()
      );
      expect(mockUserRepository.updatePractice).toHaveBeenCalled();
      expect(mockAuditService.logPracticeSettingsUpdated).toHaveBeenCalled();
    });
  });

  describe('updateUserRole', () => {
    it('should throw ForbiddenError when user is not ADMIN', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      await expect(
        settingsService.updateUserRole(ctx, 'other-user-id', 'VIEWER')
      ).rejects.toThrow(ForbiddenError);

      expect(mockUserRepository.findPracticeUserMembership).not.toHaveBeenCalled();
    });

    it('should throw BusinessRuleViolationError when trying to change own role', async () => {
      const ctx = createTestContext({ role: 'ADMIN', userId: 'admin-user-id' });

      await expect(
        settingsService.updateUserRole(ctx, 'admin-user-id', 'STAFF')
      ).rejects.toThrow(BusinessRuleViolationError);
      await expect(
        settingsService.updateUserRole(ctx, 'admin-user-id', 'STAFF')
      ).rejects.toThrow('Cannot change your own role');

      expect(mockUserRepository.findPracticeUserMembership).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when user is not in practice', async () => {
      const ctx = createTestContext({ role: 'ADMIN' });

      mockUserRepository.findPracticeUserMembership.mockResolvedValue(null);

      await expect(
        settingsService.updateUserRole(ctx, 'other-user-id', 'STAFF')
      ).rejects.toThrow(NotFoundError);
      await expect(
        settingsService.updateUserRole(ctx, 'other-user-id', 'STAFF')
      ).rejects.toThrow('User not found in practice');
    });

    it('should throw BusinessRuleViolationError when demoting the last admin', async () => {
      const ctx = createTestContext({ role: 'ADMIN', userId: 'admin-1' });

      mockUserRepository.findPracticeUserMembership.mockResolvedValue({
        id: 'membership-1',
        userId: 'admin-2',
        practiceId: ctx.practiceId,
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      mockUserRepository.countAdminsInPractice.mockResolvedValue(1);

      await expect(
        settingsService.updateUserRole(ctx, 'admin-2', 'STAFF')
      ).rejects.toThrow(BusinessRuleViolationError);
      await expect(
        settingsService.updateUserRole(ctx, 'admin-2', 'STAFF')
      ).rejects.toThrow('Cannot remove the last admin from the practice');

      expect(mockUserRepository.updatePracticeUserRole).not.toHaveBeenCalled();
    });

    it('should allow demoting an admin when there are multiple admins', async () => {
      const ctx = createTestContext({ role: 'ADMIN', userId: 'admin-1' });

      mockUserRepository.findPracticeUserMembership.mockResolvedValue({
        id: 'membership-1',
        userId: 'admin-2',
        practiceId: ctx.practiceId,
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      mockUserRepository.countAdminsInPractice.mockResolvedValue(2);

      await settingsService.updateUserRole(ctx, 'admin-2', 'STAFF');

      expect(mockUserRepository.countAdminsInPractice).toHaveBeenCalledWith(
        ctx.practiceId,
        expect.anything()
      );
      expect(mockUserRepository.updatePracticeUserRole).toHaveBeenCalledWith(
        'membership-1',
        'STAFF',
        expect.anything()
      );
      expect(mockAuditService.logUserRoleUpdated).toHaveBeenCalled();
    });

    it('should allow promoting a user to admin', async () => {
      const ctx = createTestContext({ role: 'ADMIN' });

      mockUserRepository.findPracticeUserMembership.mockResolvedValue({
        id: 'membership-1',
        userId: 'staff-user',
        practiceId: ctx.practiceId,
        role: 'STAFF',
        status: 'ACTIVE',
      });

      await settingsService.updateUserRole(ctx, 'staff-user', 'ADMIN');

      expect(mockUserRepository.countAdminsInPractice).not.toHaveBeenCalled();
      expect(mockUserRepository.updatePracticeUserRole).toHaveBeenCalledWith(
        'membership-1',
        'ADMIN',
        expect.anything()
      );
      expect(mockAuditService.logUserRoleUpdated).toHaveBeenCalled();
    });

    it('should allow changing role from STAFF to VIEWER', async () => {
      const ctx = createTestContext({ role: 'ADMIN' });

      mockUserRepository.findPracticeUserMembership.mockResolvedValue({
        id: 'membership-1',
        userId: 'staff-user',
        practiceId: ctx.practiceId,
        role: 'STAFF',
        status: 'ACTIVE',
      });

      await settingsService.updateUserRole(ctx, 'staff-user', 'VIEWER');

      expect(mockUserRepository.updatePracticeUserRole).toHaveBeenCalledWith(
        'membership-1',
        'VIEWER',
        expect.anything()
      );
      expect(mockAuditService.logUserRoleUpdated).toHaveBeenCalled();
    });
  });

  describe('removeUser', () => {
    it('should throw ForbiddenError when user is not ADMIN', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      await expect(
        settingsService.removeUser(ctx, 'other-user-id')
      ).rejects.toThrow(ForbiddenError);

      expect(mockUserRepository.findPracticeUserMembership).not.toHaveBeenCalled();
    });

    it('should throw BusinessRuleViolationError when trying to remove self', async () => {
      const ctx = createTestContext({ role: 'ADMIN', userId: 'admin-user-id' });

      await expect(
        settingsService.removeUser(ctx, 'admin-user-id')
      ).rejects.toThrow(BusinessRuleViolationError);
      await expect(
        settingsService.removeUser(ctx, 'admin-user-id')
      ).rejects.toThrow('Cannot remove yourself from the practice');

      expect(mockUserRepository.findPracticeUserMembership).not.toHaveBeenCalled();
    });

    it('should throw BusinessRuleViolationError when removing the last admin', async () => {
      const ctx = createTestContext({ role: 'ADMIN', userId: 'admin-1' });

      mockUserRepository.findPracticeUserMembership.mockResolvedValue({
        id: 'membership-1',
        userId: 'admin-2',
        practiceId: ctx.practiceId,
        role: 'ADMIN',
        status: 'ACTIVE',
        user: {
          name: 'Admin User',
          email: 'admin@example.com',
        },
      });

      mockUserRepository.countAdminsInPractice.mockResolvedValue(1);

      await expect(
        settingsService.removeUser(ctx, 'admin-2')
      ).rejects.toThrow(BusinessRuleViolationError);
      await expect(
        settingsService.removeUser(ctx, 'admin-2')
      ).rejects.toThrow('Cannot remove the last admin from the practice');

      expect(mockUserRepository.deletePracticeUserMembership).not.toHaveBeenCalled();
    });

    it('should allow removing a non-admin user', async () => {
      const ctx = createTestContext({ role: 'ADMIN' });

      mockUserRepository.findPracticeUserMembership.mockResolvedValue({
        id: 'membership-1',
        userId: 'staff-user',
        practiceId: ctx.practiceId,
        role: 'STAFF',
        status: 'ACTIVE',
        user: {
          name: 'Staff User',
          email: 'staff@example.com',
        },
      });

      await settingsService.removeUser(ctx, 'staff-user');

      expect(mockUserRepository.countAdminsInPractice).not.toHaveBeenCalled();
      expect(mockUserRepository.deletePracticeUserMembership).toHaveBeenCalledWith(
        'membership-1',
        expect.anything()
      );
      expect(mockAuditService.logUserRemovedFromPractice).toHaveBeenCalled();
    });
  });

  describe('cancelInvite', () => {
    it('should throw ForbiddenError when user is not ADMIN', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      await expect(
        settingsService.cancelInvite(ctx, 'invite-id')
      ).rejects.toThrow(ForbiddenError);

      expect(mockUserRepository.findUserInviteById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when invite does not exist', async () => {
      const ctx = createTestContext({ role: 'ADMIN' });

      mockUserRepository.findUserInviteById.mockResolvedValue(null);

      await expect(
        settingsService.cancelInvite(ctx, 'invite-id')
      ).rejects.toThrow(NotFoundError);
      await expect(
        settingsService.cancelInvite(ctx, 'invite-id')
      ).rejects.toThrow('Invite not found');

      expect(mockUserRepository.deleteUserInvite).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when invite belongs to different practice', async () => {
      const ctx = createTestContext({ role: 'ADMIN', practiceId: 'practice-1' });

      mockUserRepository.findUserInviteById.mockResolvedValue({
        id: 'invite-id',
        practiceId: 'practice-2',
        email: 'user@example.com',
        role: 'STAFF',
      });

      await expect(
        settingsService.cancelInvite(ctx, 'invite-id')
      ).rejects.toThrow(NotFoundError);

      expect(mockUserRepository.deleteUserInvite).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to cancel invite', async () => {
      const ctx = createTestContext({ role: 'ADMIN', practiceId: 'practice-1' });

      mockUserRepository.findUserInviteById.mockResolvedValue({
        id: 'invite-id',
        practiceId: 'practice-1',
        email: 'user@example.com',
        role: 'STAFF',
      });

      await settingsService.cancelInvite(ctx, 'invite-id');

      expect(mockUserRepository.deleteUserInvite).toHaveBeenCalledWith(
        'invite-id',
        expect.anything()
      );
      expect(mockAuditService.logInviteCancelled).toHaveBeenCalled();
    });
  });

  describe('createInvite', () => {
    it('should throw ForbiddenError when user is not ADMIN', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      // Mock getAuthService to avoid actual service call
      const mockAuthService = {
        createInvite: vi.fn(),
      };
      vi.doMock('@/src/services/auth', () => ({
        getAuthService: () => mockAuthService,
      }));

      await expect(
        settingsService.createInvite(ctx, {
          email: 'user@example.com',
          role: 'STAFF',
          inviterName: 'Admin',
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('updateOnboardingStatus', () => {
    it('should throw ForbiddenError when user is VIEWER', async () => {
      const ctx = createTestContext({ role: 'VIEWER' });

      await expect(
        settingsService.updateOnboardingStatus(ctx, 'complete')
      ).rejects.toThrow(ForbiddenError);

      expect(mockUserRepository.updatePractice).not.toHaveBeenCalled();
    });

    it('should allow STAFF to update onboarding status', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      await settingsService.updateOnboardingStatus(ctx, 'complete');

      expect(mockUserRepository.updatePractice).toHaveBeenCalledWith(
        ctx.practiceId,
        expect.objectContaining({
          onboardingCompletedAt: expect.any(Date),
          onboardingSkippedAt: null,
        }),
        expect.anything()
      );
      expect(mockAuditService.logPracticeSettingsUpdated).toHaveBeenCalled();
    });

    it('should allow ADMIN to update onboarding status', async () => {
      const ctx = createTestContext({ role: 'ADMIN' });

      await settingsService.updateOnboardingStatus(ctx, 'complete');

      expect(mockUserRepository.updatePractice).toHaveBeenCalledWith(
        ctx.practiceId,
        expect.objectContaining({
          onboardingCompletedAt: expect.any(Date),
          onboardingSkippedAt: null,
        }),
        expect.anything()
      );
      expect(mockAuditService.logPracticeSettingsUpdated).toHaveBeenCalled();
    });

    it('should set onboardingCompletedAt and clear onboardingSkippedAt when status is complete', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      await settingsService.updateOnboardingStatus(ctx, 'complete');

      expect(mockUserRepository.updatePractice).toHaveBeenCalledWith(
        ctx.practiceId,
        expect.objectContaining({
          onboardingCompletedAt: expect.any(Date),
          onboardingSkippedAt: null,
        }),
        expect.anything()
      );
    });

    it('should set onboardingSkippedAt when status is skip', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      await settingsService.updateOnboardingStatus(ctx, 'skip');

      expect(mockUserRepository.updatePractice).toHaveBeenCalledWith(
        ctx.practiceId,
        expect.objectContaining({
          onboardingSkippedAt: expect.any(Date),
        }),
        expect.anything()
      );
    });

    it('should clear both timestamps when status is reset', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      await settingsService.updateOnboardingStatus(ctx, 'reset');

      expect(mockUserRepository.updatePractice).toHaveBeenCalledWith(
        ctx.practiceId,
        expect.objectContaining({
          onboardingCompletedAt: null,
          onboardingSkippedAt: null,
        }),
        expect.anything()
      );
    });
  });

  describe('getSetupProgress', () => {
    it('should return setup progress with all flags false when nothing is set up', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      mockLocationRepository.findLocations.mockResolvedValue([]);
      mockPracticeSupplierRepository.findPracticeSuppliers.mockResolvedValue([]);
      mockInventoryRepository.findItems.mockResolvedValue([]);
      mockOrderRepository.findOrders.mockResolvedValue([]);

      const progress = await settingsService.getSetupProgress(ctx);

      expect(progress).toEqual({
        hasLocations: false,
        hasSuppliers: false,
        hasItems: false,
        hasOrders: false,
        hasReceivedOrders: false,
        locationCount: 0,
        supplierCount: 0,
        itemCount: 0,
        orderCount: 0,
        receivedOrderCount: 0,
      });
    });

    it('should return setup progress with correct flags when items are set up', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      mockLocationRepository.findLocations.mockResolvedValue([{ id: 'loc-1' }]);
      mockPracticeSupplierRepository.findPracticeSuppliers.mockResolvedValue([{ id: 'sup-1' }]);
      mockInventoryRepository.findItems.mockResolvedValue([{ id: 'item-1' }]);
      mockOrderRepository.findOrders.mockResolvedValue([
        { id: 'order-1', status: 'DRAFT' },
        { id: 'order-2', status: 'RECEIVED' },
      ]);

      const progress = await settingsService.getSetupProgress(ctx);

      expect(progress).toEqual({
        hasLocations: true,
        hasSuppliers: true,
        hasItems: true,
        hasOrders: true,
        hasReceivedOrders: true,
        locationCount: 1,
        supplierCount: 1,
        itemCount: 1,
        orderCount: 2,
        receivedOrderCount: 1,
      });
    });

    it('should correctly count only received orders', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      mockLocationRepository.findLocations.mockResolvedValue([]);
      mockPracticeSupplierRepository.findPracticeSuppliers.mockResolvedValue([]);
      mockInventoryRepository.findItems.mockResolvedValue([]);
      mockOrderRepository.findOrders.mockResolvedValue([
        { id: 'order-1', status: 'DRAFT' },
        { id: 'order-2', status: 'SENT' },
        { id: 'order-3', status: 'PARTIALLY_RECEIVED' },
      ]);

      const progress = await settingsService.getSetupProgress(ctx);

      expect(progress.hasOrders).toBe(true);
      expect(progress.hasReceivedOrders).toBe(false);
      expect(progress.orderCount).toBe(3);
      expect(progress.receivedOrderCount).toBe(0);
    });
  });
});

