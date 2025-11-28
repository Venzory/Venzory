import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getAuthService } from '@/src/services/auth';
import { prisma } from '@/lib/prisma';
import { PracticeRole, MembershipStatus } from '@prisma/client';
import { hash, compare } from 'bcryptjs';
import { RequestContext } from '@/src/lib/context/request-context';

describe('Auth Flows - Integration Tests', () => {
  const authService = getAuthService();
  
  let practiceId: string;
  let adminUserId: string;
  let adminCtx: RequestContext;

  beforeAll(async () => {
    // Cleanup potentially conflicting data
    await prisma.user.deleteMany({
        where: { email: { in: ['auth-test-admin@example.com', 'auth-test-user@example.com', 'auth-test-invite@example.com'] } }
    });

    // Create a practice
    const practice = await prisma.practice.create({
      data: {
        name: 'Auth Test Practice',
        slug: 'auth-test-practice',
      },
    });
    practiceId = practice.id;

    // Create an admin user
    const passwordHash = await hash('Password123!', 12);
    const admin = await prisma.user.create({
      data: {
        name: 'Auth Admin',
        email: 'auth-test-admin@example.com',
        passwordHash,
        memberships: {
          create: {
            practiceId,
            role: PracticeRole.ADMIN,
            status: MembershipStatus.ACTIVE,
            invitedAt: new Date(),
            acceptedAt: new Date(),
          },
        },
      },
    });
    adminUserId = admin.id;

    adminCtx = {
        requestId: 'test-req-auth',
        userId: adminUserId,
        userEmail: admin.email,
        userName: admin.name!,
        practiceId,
        role: 'ADMIN',
        memberships: [],
        timestamp: new Date(),
        locationId: null,
        allowedLocationIds: [],
    };
  });

  afterAll(async () => {
    // Clean up
    if (practiceId) {
      await prisma.practice.delete({ where: { id: practiceId } });
    }
    
    await prisma.user.deleteMany({
        where: { email: { in: ['auth-test-admin@example.com', 'auth-test-user@example.com', 'auth-test-invite@example.com'] } }
    });
  });

  describe('Password Reset Flow', () => {
    it('should request password reset and generate token', async () => {
      const email = 'auth-test-admin@example.com';
      
      // Request reset
      const result = await authService.requestPasswordReset(email);
      expect(result.message).toBeDefined();

      // Verify token in DB
      const token = await prisma.passwordResetToken.findFirst({
        where: { user: { email } },
        orderBy: { createdAt: 'desc' },
      });

      expect(token).toBeDefined();
      expect(token?.used).toBe(false);
      expect(token?.expiresAt.getTime()).toBeGreaterThan(Date.now());

      return token?.token; // Pass token to next test if needed, but state is better
    });

    it('should return same response for unknown email without creating token', async () => {
      const email = 'non-existent-user@example.com';

      const result = await authService.requestPasswordReset(email);
      expect(result.message).toBeDefined();

      const tokens = await prisma.passwordResetToken.findMany({
        where: { user: { email } },
      });
      expect(tokens.length).toBe(0);
    });

    it('should reset password with valid token', async () => {
      const email = 'auth-test-admin@example.com';
      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { user: { email }, used: false },
        orderBy: { createdAt: 'desc' },
      });

      expect(tokenRecord).toBeDefined();
      const token = tokenRecord!.token;
      const newPassword = 'NewPassword456!';

      // Reset password
      await authService.resetPassword(token, newPassword);

      // Verify token marked as used
      const usedToken = await prisma.passwordResetToken.findUnique({
        where: { token },
      });
      expect(usedToken?.used).toBe(true);

      // Verify login with new password
      const user = await prisma.user.findUnique({
        where: { email },
      });
      const isValid = await compare(newPassword, user!.passwordHash!);
      expect(isValid).toBe(true);
    });
  });

  describe('Invite Flow', () => {
    const inviteEmail = 'auth-test-invite@example.com';

    it('should create an invite', async () => {
      const result = await authService.createInvite(
        inviteEmail,
        practiceId,
        PracticeRole.STAFF,
        'Auth Admin',
        adminUserId
      );

      expect(result).toBeDefined();
      expect(result.email).toBe(inviteEmail);
      expect(result.role).toBe(PracticeRole.STAFF);
      expect(result.token).toBeDefined();

      // Verify in DB
      const invite = await prisma.userInvite.findUnique({
        where: { token: result.token },
      });
      expect(invite).toBeDefined();
    });

    it('should accept invite and create user', async () => {
      const invite = await prisma.userInvite.findFirst({
        where: { email: inviteEmail, used: false },
      });
      expect(invite).toBeDefined();

      const name = 'Invited User';
      const password = 'InvitePassword789!';

      const result = await authService.acceptInvite(
        invite!.token,
        name,
        password
      );

      expect(result.userId).toBeDefined();
      expect(result.email).toBe(inviteEmail);

      // Verify user created
      const user = await prisma.user.findUnique({
        where: { email: inviteEmail },
        include: { memberships: true },
      });

      expect(user).toBeDefined();
      expect(user?.name).toBe(name);
      expect(user?.memberships).toHaveLength(1);
      expect(user?.memberships[0].practiceId).toBe(practiceId);
      expect(user?.memberships[0].role).toBe(PracticeRole.STAFF);

      // Verify invite marked as used
      const usedInvite = await prisma.userInvite.findUnique({
        where: { token: invite!.token },
      });
      expect(usedInvite?.used).toBe(true);
    });
  });
});

