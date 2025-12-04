/**
 * Login Code Flow - Integration Tests
 * 
 * Tests for the 6-digit login code authentication flow:
 * - Code generation and storage
 * - Code verification
 * - Rate limiting and brute-force protection
 * - Code expiration handling
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { PracticeRole, MembershipStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

describe('Login Code Flow - Integration Tests', () => {
  const testEmail = 'login-code-test@example.com';
  let userId: string;
  let practiceId: string;

  beforeAll(async () => {
    // Cleanup any existing test data
    await prisma.loginCode.deleteMany({
      where: { identifier: testEmail },
    });
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
    await prisma.practice.deleteMany({
      where: { slug: 'login-code-test-practice' },
    });

    // Create a practice
    const practice = await prisma.practice.create({
      data: {
        name: 'Login Code Test Practice',
        slug: 'login-code-test-practice',
      },
    });
    practiceId = practice.id;

    // Create a test user
    const passwordHash = await hash('TestPassword123!', 12);
    const user = await prisma.user.create({
      data: {
        name: 'Login Code Test User',
        email: testEmail,
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
    userId = user.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.loginCode.deleteMany({
      where: { identifier: testEmail },
    });
    await prisma.verificationToken.deleteMany({
      where: { identifier: testEmail },
    });
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
    await prisma.practice.deleteMany({
      where: { slug: 'login-code-test-practice' },
    });
  });

  beforeEach(async () => {
    // Clean up login codes between tests
    await prisma.loginCode.deleteMany({
      where: { identifier: testEmail },
    });
  });

  describe('Code Generation', () => {
    it('should create a 6-digit login code', async () => {
      const code = '123456';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 10);

      const loginCode = await prisma.loginCode.create({
        data: {
          identifier: testEmail,
          code,
          expires,
          attempts: 0,
          used: false,
        },
      });

      expect(loginCode).toBeDefined();
      expect(loginCode.identifier).toBe(testEmail);
      expect(loginCode.code).toBe(code);
      expect(loginCode.code.length).toBe(6);
      expect(loginCode.attempts).toBe(0);
      expect(loginCode.used).toBe(false);
      expect(loginCode.expires.getTime()).toBeGreaterThan(Date.now());
    });

    it('should store code as string to preserve leading zeros', async () => {
      const codeWithLeadingZero = '012345';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 10);

      const loginCode = await prisma.loginCode.create({
        data: {
          identifier: testEmail,
          code: codeWithLeadingZero,
          expires,
        },
      });

      expect(loginCode.code).toBe(codeWithLeadingZero);
      expect(loginCode.code.length).toBe(6);
      expect(loginCode.code.startsWith('0')).toBe(true);
    });

    it('should invalidate old codes when creating new one', async () => {
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 10);

      // Create first code
      await prisma.loginCode.create({
        data: {
          identifier: testEmail,
          code: '111111',
          expires,
        },
      });

      // Simulate invalidating old codes (as done in auth.ts)
      await prisma.loginCode.updateMany({
        where: {
          identifier: testEmail,
          used: false,
        },
        data: {
          used: true,
        },
      });

      // Create new code
      await prisma.loginCode.create({
        data: {
          identifier: testEmail,
          code: '222222',
          expires,
        },
      });

      // Check that only the new code is valid
      const validCodes = await prisma.loginCode.findMany({
        where: {
          identifier: testEmail,
          used: false,
        },
      });

      expect(validCodes.length).toBe(1);
      expect(validCodes[0].code).toBe('222222');
    });
  });

  describe('Code Verification', () => {
    it('should find valid code for email', async () => {
      const code = '654321';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 10);

      await prisma.loginCode.create({
        data: {
          identifier: testEmail,
          code,
          expires,
        },
      });

      const foundCode = await prisma.loginCode.findFirst({
        where: {
          identifier: testEmail,
          used: false,
          expires: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(foundCode).toBeDefined();
      expect(foundCode?.code).toBe(code);
    });

    it('should not find expired code', async () => {
      const code = '999999';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() - 5); // Expired 5 minutes ago

      await prisma.loginCode.create({
        data: {
          identifier: testEmail,
          code,
          expires,
        },
      });

      const foundCode = await prisma.loginCode.findFirst({
        where: {
          identifier: testEmail,
          used: false,
          expires: { gt: new Date() },
        },
      });

      expect(foundCode).toBeNull();
    });

    it('should not find used code', async () => {
      const code = '888888';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 10);

      await prisma.loginCode.create({
        data: {
          identifier: testEmail,
          code,
          expires,
          used: true,
        },
      });

      const foundCode = await prisma.loginCode.findFirst({
        where: {
          identifier: testEmail,
          used: false,
          expires: { gt: new Date() },
        },
      });

      expect(foundCode).toBeNull();
    });

    it('should increment attempts on each verification try', async () => {
      const code = '777777';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 10);

      const loginCode = await prisma.loginCode.create({
        data: {
          identifier: testEmail,
          code,
          expires,
        },
      });

      // Simulate multiple verification attempts
      await prisma.loginCode.update({
        where: { id: loginCode.id },
        data: { attempts: { increment: 1 } },
      });

      await prisma.loginCode.update({
        where: { id: loginCode.id },
        data: { attempts: { increment: 1 } },
      });

      const updatedCode = await prisma.loginCode.findUnique({
        where: { id: loginCode.id },
      });

      expect(updatedCode?.attempts).toBe(2);
    });

    it('should mark code as used after successful verification', async () => {
      const code = '666666';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 10);

      const loginCode = await prisma.loginCode.create({
        data: {
          identifier: testEmail,
          code,
          expires,
        },
      });

      // Simulate successful verification
      await prisma.loginCode.update({
        where: { id: loginCode.id },
        data: { used: true },
      });

      const usedCode = await prisma.loginCode.findUnique({
        where: { id: loginCode.id },
      });

      expect(usedCode?.used).toBe(true);
    });
  });

  describe('Brute Force Protection', () => {
    const MAX_ATTEMPTS = 5;

    it('should allow up to max attempts', async () => {
      const code = '555555';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 10);

      const loginCode = await prisma.loginCode.create({
        data: {
          identifier: testEmail,
          code,
          expires,
          attempts: MAX_ATTEMPTS - 1,
        },
      });

      // Should still be valid
      const foundCode = await prisma.loginCode.findFirst({
        where: {
          identifier: testEmail,
          used: false,
          expires: { gt: new Date() },
          attempts: { lt: MAX_ATTEMPTS },
        },
      });

      expect(foundCode).toBeDefined();
    });

    it('should reject code after max attempts exceeded', async () => {
      const code = '444444';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 10);

      await prisma.loginCode.create({
        data: {
          identifier: testEmail,
          code,
          expires,
          attempts: MAX_ATTEMPTS,
        },
      });

      // Should not be valid
      const foundCode = await prisma.loginCode.findFirst({
        where: {
          identifier: testEmail,
          used: false,
          expires: { gt: new Date() },
          attempts: { lt: MAX_ATTEMPTS },
        },
      });

      expect(foundCode).toBeNull();
    });
  });

  describe('Unique Constraints', () => {
    it('should enforce unique constraint on identifier + code', async () => {
      const code = '333333';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 10);

      // Create first code
      await prisma.loginCode.create({
        data: {
          identifier: testEmail,
          code,
          expires,
        },
      });

      // Attempt to create duplicate should fail
      await expect(
        prisma.loginCode.create({
          data: {
            identifier: testEmail,
            code, // Same code for same email
            expires,
          },
        })
      ).rejects.toThrow();
    });

    it('should allow same code for different emails', async () => {
      const code = '222222';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 10);

      // Create code for test email
      await prisma.loginCode.create({
        data: {
          identifier: testEmail,
          code,
          expires,
        },
      });

      // Create same code for different email should work
      const anotherEmail = 'another-test@example.com';
      const anotherCode = await prisma.loginCode.create({
        data: {
          identifier: anotherEmail,
          code,
          expires,
        },
      });

      expect(anotherCode).toBeDefined();
      expect(anotherCode.code).toBe(code);

      // Clean up
      await prisma.loginCode.deleteMany({
        where: { identifier: anotherEmail },
      });
    });
  });

  describe('Code Expiration', () => {
    it('should have 10-minute expiration window', async () => {
      const code = '111111';
      const now = new Date();
      const expires = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

      const loginCode = await prisma.loginCode.create({
        data: {
          identifier: testEmail,
          code,
          expires,
        },
      });

      // Check expiration is approximately 10 minutes from now
      const expirationDiff = loginCode.expires.getTime() - now.getTime();
      expect(expirationDiff).toBeGreaterThan(9 * 60 * 1000); // At least 9 minutes
      expect(expirationDiff).toBeLessThanOrEqual(10 * 60 * 1000 + 1000); // At most 10 minutes + 1 second buffer
    });
  });
});

