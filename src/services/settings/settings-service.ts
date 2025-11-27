/**
 * Settings Service
 * Business logic for practice settings and user management
 */

import { UserRepository, UserLocationRepository, userLocationRepository } from '@/src/repositories/users';
import { PracticeSupplierRepository, getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { InventoryRepository } from '@/src/repositories/inventory';
import { OrderRepository } from '@/src/repositories/orders';
import { LocationRepository } from '@/src/repositories/locations';
import { AuditService, getAuditService } from '../audit/audit-service';
import type { RequestContext } from '@/src/lib/context/request-context';
import { requireRole } from '@/src/lib/context/context-builder';
import { withTransaction } from '@/src/repositories/base';
import {
  ValidationError,
  BusinessRuleViolationError,
  NotFoundError,
  ForbiddenError,
} from '@/src/domain/errors';
import { validateStringLength } from '@/src/domain/validators';
import { getAuthService } from '../auth';
import type { PracticeRole, UserInvite } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

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
    private userLocationRepository: UserLocationRepository,
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
   * New roles: OWNER, ADMIN, MANAGER, STAFF
   */
  async updateUserRole(
    ctx: RequestContext,
    userId: string,
    role: PracticeRole
  ): Promise<void> {
    // Check permissions - only ADMIN+ can change roles
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

      // Only OWNER can assign OWNER role
      if (role === 'OWNER' && ctx.role !== 'OWNER') {
        throw new ForbiddenError('Only the organization owner can assign the owner role');
      }

      // Cannot demote OWNER unless you are the OWNER
      if (oldRole === 'OWNER' && ctx.role !== 'OWNER') {
        throw new ForbiddenError('Only the organization owner can change their own role');
      }

      // Prevent removing the last OWNER or ADMIN
      if ((oldRole === 'OWNER' || oldRole === 'ADMIN') && role !== 'OWNER' && role !== 'ADMIN') {
        const ownerAdminCount = await this.userRepository.countOwnersAndAdminsInPractice(
          ctx.practiceId,
          { tx }
        );

        if (ownerAdminCount === 1) {
          throw new BusinessRuleViolationError(
            'Cannot remove the last owner/admin from the organization'
          );
        }
      }

      // Update role
      await this.userRepository.updatePracticeUserRole(
        membership.id,
        role,
        { tx }
      );

      // If promoting to OWNER or ADMIN, grant access to all locations
      if ((role === 'OWNER' || role === 'ADMIN') && oldRole !== 'OWNER' && oldRole !== 'ADMIN') {
        await this.userLocationRepository.assignAllPracticeLocations(
          membership.id,
          ctx.practiceId,
          { tx }
        );
      }

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

      logger.info(
        {
          action: 'onboarding-status',
          status,
          practiceId: ctx.practiceId,
          userId: ctx.userId,
        },
        'Practice onboarding status changed',
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
   * Get user location assignments
   * Returns the locations a specific user has access to
   */
  async getUserLocationAccess(ctx: RequestContext, userId: string) {
    // Must be ADMIN to view other users' location access
    if (userId !== ctx.userId) {
      requireRole(ctx, 'ADMIN');
    }

    // Find the membership
    const membership = await this.userRepository.findPracticeUserMembership(
      ctx.practiceId,
      userId
    );

    if (!membership) {
      throw new NotFoundError('User not found in practice');
    }

    // OWNER and ADMIN have access to all locations
    if (membership.role === 'OWNER' || membership.role === 'ADMIN') {
      const locations = await this.locationRepository.findLocations(ctx.practiceId);
      return {
        hasFullAccess: true,
        locations: locations.map(l => ({ id: l.id, name: l.name, code: l.code })),
      };
    }

    // Get explicit location assignments
    const locationAccess = await this.userLocationRepository.findUserLocations(membership.id);

    return {
      hasFullAccess: false,
      locations: locationAccess.map(la => la.location),
    };
  }

  /**
   * Set user location assignments
   * Updates the locations a user can access
   * Only for MANAGER and STAFF roles (OWNER/ADMIN have automatic full access)
   */
  async setUserLocationAccess(
    ctx: RequestContext,
    userId: string,
    locationIds: string[]
  ): Promise<void> {
    // Check permissions - only ADMIN can assign locations
    requireRole(ctx, 'ADMIN');

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

      // OWNER and ADMIN don't need explicit location assignments
      if (membership.role === 'OWNER' || membership.role === 'ADMIN') {
        throw new BusinessRuleViolationError(
          'Owners and admins automatically have access to all locations'
        );
      }

      // Validate that all locations belong to this practice
      const practiceLocations = await this.locationRepository.findLocations(ctx.practiceId, { tx });
      const practiceLocationIds = new Set(practiceLocations.map(l => l.id));
      
      for (const locId of locationIds) {
        if (!practiceLocationIds.has(locId)) {
          throw new ValidationError(`Location ${locId} does not belong to this practice`);
        }
      }

      // Update location assignments
      await this.userLocationRepository.setUserLocations(
        membership.id,
        locationIds,
        { tx }
      );

      // Log audit event
      await this.auditService.logPracticeSettingsUpdated(
        ctx,
        ctx.practiceId,
        {
          action: 'user_location_access_updated',
          userId,
          locationIds,
        },
        tx
      );

      logger.info(
        {
          action: 'user-location-access-updated',
          practiceId: ctx.practiceId,
          targetUserId: userId,
          locationIds,
          updatedBy: ctx.userId,
        },
        'User location access updated',
      );
    });
  }

  /**
   * Get all users with their location assignments
   * For admin UI display
   */
  async getPracticeUsersWithLocations(ctx: RequestContext) {
    requireRole(ctx, 'ADMIN');

    const users = await this.userRepository.findPracticeUsersWithDetails(ctx.practiceId);
    const locations = await this.locationRepository.findLocations(ctx.practiceId);

    // For each user, get their location access
    const usersWithLocations = await Promise.all(
      users.map(async (user) => {
        // OWNER and ADMIN have full access
        if (user.role === 'OWNER' || user.role === 'ADMIN') {
          return {
            ...user,
            hasFullAccess: true,
            allowedLocationIds: locations.map(l => l.id),
          };
        }

        // Get explicit assignments for MANAGER/STAFF
        const locationAccess = await this.userLocationRepository.getUserLocationIds(user.id);
        
        return {
          ...user,
          hasFullAccess: false,
          allowedLocationIds: locationAccess,
        };
      })
    );

    return {
      users: usersWithLocations,
      allLocations: locations.map(l => ({ id: l.id, name: l.name, code: l.code })),
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
    settingsServiceInstance = new SettingsService(
      new UserRepository(),
      getPracticeSupplierRepository(),
      new InventoryRepository(),
      new OrderRepository(),
      new LocationRepository(),
      userLocationRepository,
      getAuditService()
    );
  }
  return settingsServiceInstance;
}

