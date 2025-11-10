/**
 * Settings Service
 * Business logic for practice settings and user management
 */

import { UserRepository } from '@/src/repositories/users';
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
        const generateSlug = require('@/lib/slug').generateUniquePracticeSlug;
        slug = await generateSlug(input.name);
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
}

// Singleton instance
let settingsServiceInstance: SettingsService | null = null;

export function getSettingsService(): SettingsService {
  if (!settingsServiceInstance) {
    const { getAuditService } = require('../audit/audit-service');
    settingsServiceInstance = new SettingsService(
      new UserRepository(),
      getAuditService()
    );
  }
  return settingsServiceInstance;
}

