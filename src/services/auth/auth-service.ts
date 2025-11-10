/**
 * Auth Service
 * Handles public authentication operations: registration, password reset, invite acceptance
 * These are public methods that don't require RequestContext since they're not tenant-scoped
 */

import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { MembershipStatus, PracticeRole, User, Practice, UserInvite, PasswordResetToken } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { withTransaction } from '@/src/repositories/base/transaction';
import { generateUniquePracticeSlug } from '@/lib/slug';
import { sendPasswordResetEmail, sendUserInviteEmail } from '@/lib/email';
import { ConflictError, NotFoundError, ValidationError } from '@/src/domain/errors';

/**
 * Result type for practice registration
 */
interface RegisterPracticeResult {
  practice: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: string;
    email: string;
  };
}

/**
 * Result type for invite acceptance
 */
interface AcceptInviteResult {
  userId: string;
  practiceId: string;
  redirectTo: string;
}

/**
 * Result type for password reset request
 */
interface PasswordResetRequestResult {
  message: string;
}

/**
 * Result type for password reset
 */
interface PasswordResetResult {
  message: string;
}

/**
 * Invite with practice details
 */
interface InviteWithPractice extends UserInvite {
  practice: {
    id: string;
    name: string;
  };
}

/**
 * Password reset token with user
 */
interface ResetTokenWithUser extends PasswordResetToken {
  user: User;
}

/**
 * Service interface for authentication operations
 */
interface IAuthService {
  registerPractice(
    practiceName: string,
    email: string,
    password: string,
    name: string
  ): Promise<RegisterPracticeResult>;

  requestPasswordReset(email: string): Promise<PasswordResetRequestResult>;

  resetPassword(token: string, newPassword: string): Promise<PasswordResetResult>;

  acceptInvite(
    token: string,
    name: string,
    password: string
  ): Promise<AcceptInviteResult>;

  validateInviteToken(token: string): Promise<InviteWithPractice>;

  validateResetToken(token: string): Promise<ResetTokenWithUser>;

  createInvite(
    email: string,
    practiceId: string,
    role: PracticeRole,
    inviterName: string | null,
    inviterUserId: string
  ): Promise<UserInvite>;
}

/**
 * Implementation of auth service
 * Public operations that don't require tenant scoping
 */
class AuthServiceImpl implements IAuthService {
  /**
   * Register new practice with admin user
   * This is a public operation (no authentication required)
   */
  async registerPractice(
    practiceName: string,
    email: string,
    password: string,
    name: string
  ): Promise<RegisterPracticeResult> {
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email already exists. Please sign in instead.');
    }

    // Generate unique slug for practice
    const slug = await generateUniquePracticeSlug(practiceName);

    // Hash password
    const passwordHash = await hash(password, 12);

    // Create practice and admin user in transaction
    const result = await withTransaction(async (tx) => {
      const practice = await tx.practice.create({
        data: {
          name: practiceName,
          slug,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          memberships: {
            create: {
              practiceId: practice.id,
              role: PracticeRole.ADMIN,
              status: MembershipStatus.ACTIVE,
              invitedAt: new Date(),
              acceptedAt: new Date(),
            },
          },
        },
      });

      // Note: Audit logging would be done here if we had system-level audit context
      // For now, registration is tracked via user creation timestamp

      return { practice, user };
    });

    return {
      practice: {
        id: result.practice.id,
        name: result.practice.name,
        slug: result.practice.slug,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
      },
    };
  }

  /**
   * Request password reset
   * Creates token and sends email
   * Returns success message regardless of whether user exists (anti-enumeration)
   */
  async requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
    const normalizedEmail = email.toLowerCase();

    // Look up user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Anti-enumeration: Always return same message
    const message = 'If an account exists with that email, you will receive a password reset link shortly.';

    // If user doesn't exist or has no password (OAuth-only), still return success
    if (!user || !user.passwordHash) {
      return { message };
    }

    // Generate secure random token
    const token = randomBytes(32).toString('hex');

    // Calculate expiration time (60 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 60);

    // Store token in database
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
        used: false,
      },
    });

    // Send password reset email (don't fail request if email fails)
    try {
      await sendPasswordResetEmail({
        email: user.email,
        token,
        name: user.name,
      });
    } catch (error) {
      console.error('[AuthService] Failed to send password reset email:', error);
    }

    return { message };
  }

  /**
   * Reset password using token
   * Validates token and updates user's password
   */
  async resetPassword(token: string, newPassword: string): Promise<PasswordResetResult> {
    // Look up token from database
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Validate token exists
    if (!resetToken) {
      throw new ValidationError('Invalid or expired reset token');
    }

    // Check if already used
    if (resetToken.used) {
      throw new ValidationError('This reset token has already been used');
    }

    // Check if expired
    if (new Date() > resetToken.expiresAt) {
      throw new ValidationError('This reset token has expired');
    }

    // Hash new password
    const passwordHash = await hash(newPassword, 12);

    // Update user's password and mark token as used in a transaction
    await withTransaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });

      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      });
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Accept invite and create user/membership
   * Handles both new users and existing users
   */
  async acceptInvite(
    token: string,
    name: string,
    password: string
  ): Promise<AcceptInviteResult> {
    // Find and validate invite
    const invite = await prisma.userInvite.findUnique({
      where: { token },
      include: {
        practice: {
          select: { id: true, name: true },
        },
      },
    });

    if (!invite) {
      throw new NotFoundError('Invalid invitation token');
    }

    if (invite.used) {
      throw new ConflictError('This invitation has already been used');
    }

    if (new Date() > invite.expiresAt) {
      throw new ValidationError('This invitation has expired');
    }

    const normalizedEmail = invite.email.toLowerCase();

    // Hash password
    const passwordHash = await hash(password, 12);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          where: { practiceId: invite.practiceId },
        },
      },
    });

    let userId: string;
    let redirectTo: string;

    if (existingUser) {
      // User exists - check if already a member
      if (existingUser.memberships.length > 0) {
        throw new ConflictError('You are already a member of this practice');
      }

      // User exists but not a member - create membership
      await withTransaction(async (tx) => {
        await tx.practiceUser.create({
          data: {
            userId: existingUser.id,
            practiceId: invite.practiceId,
            role: invite.role,
            status: MembershipStatus.ACTIVE,
            invitedAt: invite.createdAt,
            acceptedAt: new Date(),
          },
        });

        // Mark invite as used
        await tx.userInvite.update({
          where: { id: invite.id },
          data: { used: true },
        });
      });

      userId = existingUser.id;
      redirectTo = '/dashboard';
    } else {
      // New user - create user and membership
      const result = await withTransaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            name,
            email: normalizedEmail,
            passwordHash,
            memberships: {
              create: {
                practiceId: invite.practiceId,
                role: invite.role,
                status: MembershipStatus.ACTIVE,
                invitedAt: invite.createdAt,
                acceptedAt: new Date(),
              },
            },
          },
        });

        // Mark invite as used
        await tx.userInvite.update({
          where: { id: invite.id },
          data: { used: true },
        });

        return { user: newUser };
      });

      userId = result.user.id;
      redirectTo = '/dashboard';
    }

    return {
      userId,
      practiceId: invite.practiceId,
      redirectTo,
    };
  }

  /**
   * Validate invite token for display purposes
   * Returns invite with practice info if valid
   */
  async validateInviteToken(token: string): Promise<InviteWithPractice> {
    const invite = await prisma.userInvite.findUnique({
      where: { token },
      include: {
        practice: {
          select: { id: true, name: true },
        },
      },
    });

    if (!invite) {
      throw new NotFoundError('Invalid invitation token');
    }

    if (invite.used) {
      throw new ConflictError('This invitation has already been used');
    }

    if (new Date() > invite.expiresAt) {
      throw new ValidationError('This invitation has expired');
    }

    return invite;
  }

  /**
   * Validate password reset token for display purposes
   * Returns token with user info if valid
   */
  async validateResetToken(token: string): Promise<ResetTokenWithUser> {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new NotFoundError('Invalid or expired reset token');
    }

    if (resetToken.used) {
      throw new ValidationError('This reset token has already been used');
    }

    if (new Date() > resetToken.expiresAt) {
      throw new ValidationError('This reset token has expired');
    }

    return resetToken;
  }

  /**
   * Create user invite
   * This is used by the API route (requires authenticated user context via params)
   */
  async createInvite(
    email: string,
    practiceId: string,
    role: PracticeRole,
    inviterName: string | null,
    inviterUserId: string
  ): Promise<UserInvite> {
    const normalizedEmail = email.toLowerCase();

    // Get practice details
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: { id: true, name: true },
    });

    if (!practice) {
      throw new NotFoundError('Practice not found');
    }

    // Check if user already exists and is a member
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          where: { practiceId },
        },
      },
    });

    if (existingUser && existingUser.memberships.length > 0) {
      throw new ConflictError('This user is already a member of your practice');
    }

    // Check for existing unused invite
    const existingInvite = await prisma.userInvite.findFirst({
      where: {
        email: normalizedEmail,
        practiceId,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      throw new ConflictError('An active invitation already exists for this email');
    }

    // Generate secure random token
    const token = randomBytes(32).toString('hex');

    // Calculate expiration time (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invite in database
    const invite = await prisma.userInvite.create({
      data: {
        token,
        email: normalizedEmail,
        practiceId,
        role,
        inviterName,
        expiresAt,
        used: false,
      },
    });

    // Send invitation email (don't fail request if email fails)
    try {
      const inviter = await prisma.user.findUnique({
        where: { id: inviterUserId },
        select: { name: true },
      });

      await sendUserInviteEmail({
        email: normalizedEmail,
        token,
        practiceName: practice.name,
        role,
        inviterName: inviter?.name ?? undefined,
      });
    } catch (error) {
      console.error('[AuthService] Failed to send invite email:', error);
    }

    return invite;
  }
}

// Singleton instance
let authServiceInstance: IAuthService | null = null;

/**
 * Get singleton instance of AuthService
 */
export function getAuthService(): IAuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthServiceImpl();
  }
  return authServiceInstance;
}

export type { IAuthService };

