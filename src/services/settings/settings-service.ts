/**
 * Settings Service
 * Business logic for practice settings and user management
 */

import { UserRepository } from '@/src/repositories/users';
import { PracticeSupplierRepository } from '@/src/repositories/suppliers';
import { InventoryRepository } from '@/src/repositories/inventory';
import { OrderRepository } from '@/src/repositories/orders';
import { LocationRepository } from '@/src/repositories/locations';
import { AuditService } from '../audit/audit-service';
import type { RequestContext } from '@/src/lib/context/request-context';
import { requireRole } from '@/src/lib/context/context-builder';
import { withTransaction } from '@/src/repositories/base';
import {
  ValidationError,
  BusinessRuleViolationError,
  NotFoundError,
} from '@/src/domain/errors';
import { validateStringLength } from '@/src/domain/validators';
import { getAuthService } from '../auth';
import type { PracticeRole, UserInvite } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface UpdatePracticeSettingsInput {
  name: string;
  street?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  logoUrl?: string | null;
}

export class SettingsService {
  constructor(
    private userRepository: UserRepository,
    private practiceSupplierRepository: PracticeSupplierRepository,
    private inventoryRepository: InventoryRepository,
    private orderRepository: OrderRepository,
    private locationRepository: LocationRepository,
    private auditService: AuditService
  ) {}

  /**
   * Update practice settings
   */
  async updatePracticeSettings(
    ctx: RequestContext,
    input: UpdatePracticeSettingsInput
  ): Promise<void> {
    // Check permissions
    requireRole(ctx, 'ADMIN');

    // Validate input
    validateStringLength(input.name, 'Practice name', 1, 100);
    if (input.contactEmail && input.contactEmail.length > 255) {
      throw new ValidationError('Contact email is too long');
    }

    return withTransaction(async (tx) => {
      // Fetch current practice
      const practice = await this.userRepository.findPracticeById(
        ctx.practiceId,
        { tx }
      );

      if (!practice) {
        throw new NotFoundError('Practice not found');
      }

      // Generate new slug if name changed
      let slug = practice.slug;
      if (practice.name !== input.name) {
        slug = await this.userRepository.generateUniquePracticeSlug(
          input.name,
          ctx.practiceId,
          { tx }
        );
      }

      // Update practice
      await this.userRepository.updatePractice(
        ctx.practiceId,
        {
          name: input.name,
          slug,
          street: input.street ?? null,
          city: input.city ?? null,
          postalCode: input.postalCode ?? null,
          country: input.country ?? null,
          contactEmail: input.contactEmail ?? null,
          contactPhone: input.contactPhone ?? null,
          logoUrl: input.logoUrl ?? null,
        },
        { tx }
      );

      // Log audit event
      await this.auditService.logPracticeSettingsUpdated(
        ctx,
        ctx.practiceId,
        input,
        tx
      );
    });
  }

  /**
   * Update user role
   */
  async updateUserRole(
    ctx: RequestContext,
    userId: string,
    role: 'VIEWER' | 'STAFF' | 'ADMIN'
  ): Promise<void> {
    // Check permissions
    requireRole(ctx, 'ADMIN');

    // Cannot change own role
    if (userId === ctx.userId) {
      throw new BusinessRuleViolationError('Cannot change your own role');
    }

    return withTransaction(async (tx) => {
      // Find the membership
      const membership = await this.userRepository.findPracticeUserMembership(
        ctx.practiceId,
        userId,
        { tx }
      );

      if (!membership) {
        throw new NotFoundError('User not found in practice');
      }

      const oldRole = membership.role;

      // Prevent demoting the last admin
      if (oldRole === 'ADMIN' && role !== 'ADMIN') {
        const adminCount = await this.userRepository.countAdminsInPractice(
          ctx.practiceId,
          { tx }
        );

        if (adminCount === 1) {
          throw new BusinessRuleViolationError(
            'Cannot remove the last admin from the practice'
          );
        }
      }

      // Update role
      await this.userRepository.updatePracticeUserRole(
        membership.id,
        role,
        { tx }
      );

      // Log audit event
      await this.auditService.logUserRoleUpdated(
        ctx,
        userId,
        { oldRole, newRole: role },
        tx
      );
    });
  }

  /**
   * Remove user from practice
   */
  async removeUser(ctx: RequestContext, userId: string): Promise<void> {
    // Check permissions
    requireRole(ctx, 'ADMIN');

    // Cannot remove self
    if (userId === ctx.userId) {
      throw new BusinessRuleViolationError('Cannot remove yourself from the practice');
    }

    return withTransaction(async (tx) => {
      // Find the membership
      const membership = await this.userRepository.findPracticeUserMembership(
        ctx.practiceId,
        userId,
        {
          tx,
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        }
      );

      if (!membership) {
        throw new NotFoundError('User not found in practice');
      }

      // Check if this is the last admin
      if (membership.role === 'ADMIN') {
        const adminCount = await this.userRepository.countAdminsInPractice(
          ctx.practiceId,
          { tx }
        );

        if (adminCount === 1) {
          throw new BusinessRuleViolationError(
            'Cannot remove the last admin from the practice'
          );
        }
      }

      // Delete membership
      await this.userRepository.deletePracticeUserMembership(
        membership.id,
        { tx }
      );

      // Log audit event
      await this.auditService.logUserRemovedFromPractice(
        ctx,
        userId,
        {
          name: membership.user.name ?? 'Unknown',
          email: membership.user.email,
          role: membership.role,
        },
        tx
      );
    });
  }

  /**
   * Cancel invite
   */
  async cancelInvite(ctx: RequestContext, inviteId: string): Promise<void> {
    // Check permissions
    requireRole(ctx, 'ADMIN');

    return withTransaction(async (tx) => {
      // Verify invite belongs to this practice
      const invite = await this.userRepository.findUserInviteById(inviteId, { tx });

      if (!invite || invite.practiceId !== ctx.practiceId) {
        throw new NotFoundError('Invite not found');
      }

      // Delete invite
      await this.userRepository.deleteUserInvite(inviteId, { tx });

      // Log audit event
      await this.auditService.logInviteCancelled(
        ctx,
        inviteId,
        {
          email: invite.email,
          role: invite.role,
        },
        tx
      );
    });
  }

  /**
   * Create user invite
   * Requires ADMIN role
   */
  async createInvite(
    ctx: RequestContext,
    input: {
      email: string;
      role: PracticeRole;
      inviterName: string | null;
    }
  ): Promise<UserInvite> {
    // Check permissions - only ADMIN can invite users
    requireRole(ctx, 'ADMIN');

    // Delegate to AuthService for actual invite creation
    return getAuthService().createInvite(
      input.email,
      ctx.practiceId,
      input.role,
      input.inviterName,
      ctx.userId
    );
  }

  /**
   * Get practice settings
   */
  async getPracticeSettings(ctx: RequestContext) {
    const practice = await this.userRepository.findPracticeById(ctx.practiceId);

    if (!practice) {
      throw new NotFoundError('Practice not found');
    }

    return practice;
  }

  /**
   * Get practice users
   */
  async getPracticeUsers(ctx: RequestContext) {
    return this.userRepository.findPracticeUsersWithDetails(ctx.practiceId);
  }

  /**
   * Get pending invites
   */
  async getPendingInvites(ctx: RequestContext) {
    return this.userRepository.findPendingInvites(ctx.practiceId);
  }

  /**
   * Get practice suppliers with tenant scoping
   */
  async getPracticeSuppliers(ctx: RequestContext) {
    return this.practiceSupplierRepository.findPracticeSuppliers(ctx.practiceId);
  }

  /**
   * Update onboarding status
   * Can mark as complete, skipped, or reset
   * Requires STAFF role (admins and staff can manage onboarding)
   */
  async updateOnboardingStatus(
    ctx: RequestContext,
    status: 'complete' | 'skip' | 'reset'
  ): Promise<void> {
    // Check permissions - only STAFF and ADMIN can manage onboarding
    requireRole(ctx, 'STAFF');

    return withTransaction(async (tx) => {
      const updateData: any = {};
      
      if (status === 'complete') {
        updateData.onboardingCompletedAt = new Date();
        updateData.onboardingSkippedAt = null;
      } else if (status === 'skip') {
        updateData.onboardingSkippedAt = new Date();
      } else if (status === 'reset') {
        updateData.onboardingCompletedAt = null;
        updateData.onboardingSkippedAt = null;
      }

      await this.userRepository.updatePractice(
        ctx.practiceId,
        updateData,
        { tx }
      );

      // Log audit event
      await this.auditService.logPracticeSettingsUpdated(
        ctx,
        ctx.practiceId,
        { onboardingStatus: status },
        tx
      );
    });
  }

  /**
   * Get practice onboarding status
   */
  async getPracticeOnboardingStatus(ctx: RequestContext) {
    const practice = await this.userRepository.findPracticeById(ctx.practiceId);

    if (!practice) {
      throw new NotFoundError('Practice not found');
    }

    return {
      onboardingCompletedAt: practice.onboardingCompletedAt,
      onboardingSkippedAt: practice.onboardingSkippedAt,
    };
  }

  /**
   * Get setup progress (counts for locations, suppliers, items, orders, received orders)
   */
  async getSetupProgress(ctx: RequestContext) {
    // Use repositories to get counts with proper tenant scoping
    const [locationCount, supplierCount, itemCount, orderCount, allOrders] = await Promise.all([
      this.locationRepository.findLocations(ctx.practiceId).then(l => l.length),
      this.practiceSupplierRepository.findPracticeSuppliers(ctx.practiceId).then(s => s.length),
      this.inventoryRepository.findItems(ctx.practiceId, {}).then(i => i.length),
      this.orderRepository.findOrders(ctx.practiceId, {}).then(o => o.length),
      this.orderRepository.findOrders(ctx.practiceId, {}),
    ]);

    // Count received orders
    const receivedOrderCount = allOrders.filter(o => o.status === 'RECEIVED').length;

    return {
      hasLocations: locationCount > 0,
      hasSuppliers: supplierCount > 0,
      hasItems: itemCount > 0,
      hasOrders: orderCount > 0,
      hasReceivedOrders: receivedOrderCount > 0,
      locationCount,
      supplierCount,
      itemCount,
      orderCount,
      receivedOrderCount,
    };
  }

}

// Singleton instance
let settingsServiceInstance: SettingsService | null = null;

export function getSettingsService(): SettingsService {
  if (!settingsServiceInstance) {
    const { getAuditService } = require('../audit/audit-service');
    const { getPracticeSupplierRepository } = require('@/src/repositories/suppliers');
    settingsServiceInstance = new SettingsService(
      new UserRepository(),
      getPracticeSupplierRepository(),
      new InventoryRepository(),
      new OrderRepository(),
      new LocationRepository(),
      getAuditService()
    );
  }
  return settingsServiceInstance;
}

