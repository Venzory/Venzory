/**
 * Login Code Verification API
 * 
 * Validates 6-digit login codes as an alternative to magic links.
 * This endpoint creates a session when a valid code is provided.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { timingSafeEqual } from 'crypto';

import { prisma } from '@/lib/prisma';
import { loginCodeRateLimiter, getClientIp } from '@/lib/rate-limit';
import logger from '@/lib/logger';
import { apiHandler } from '@/lib/api-handler';
import { ValidationError, RateLimitError } from '@/src/domain/errors';

// Maximum attempts allowed per code before it's invalidated
const MAX_CODE_ATTEMPTS = 5;

// Schema for login code verification
const loginCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be 6 digits'),
});

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return timingSafeEqual(bufA, bufB);
}

export const POST = apiHandler(async (request: Request) => {
  const body = await request.json();
  const parsed = loginCodeSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid input', parsed.error.flatten().fieldErrors);
  }

  const { email, code } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  // Rate limiting: Check based on IP and email
  const clientIp = getClientIp(request);
  const rateLimitKey = `${clientIp}:${normalizedEmail}`;
  const rateLimitResult = await loginCodeRateLimiter.check(rateLimitKey);

  if (!rateLimitResult.success) {
    throw new RateLimitError('Too many login attempts. Please try again later.', {
      limit: rateLimitResult.limit,
      remaining: rateLimitResult.remaining,
      reset: rateLimitResult.reset,
    });
  }

  // Find a valid login code for this email
  const loginCode = await prisma.loginCode.findFirst({
    where: {
      identifier: normalizedEmail,
      used: false,
      expires: { gt: new Date() },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // If no valid code exists
  if (!loginCode) {
    logger.info({
      module: 'auth',
      operation: 'verifyLoginCode',
      email: normalizedEmail,
      result: 'no_valid_code',
    }, 'Login code verification failed - no valid code found');

    return NextResponse.json(
      { error: 'Invalid or expired code. Please request a new login email.' },
      { status: 401 }
    );
  }

  // Check if max attempts exceeded
  if (loginCode.attempts >= MAX_CODE_ATTEMPTS) {
    // Mark as used to prevent further attempts
    await prisma.loginCode.update({
      where: { id: loginCode.id },
      data: { used: true },
    });

    logger.warn({
      module: 'auth',
      operation: 'verifyLoginCode',
      email: normalizedEmail,
      codeId: loginCode.id,
      attempts: loginCode.attempts,
    }, 'Login code max attempts exceeded');

    return NextResponse.json(
      { error: 'Too many incorrect attempts. Please request a new login email.' },
      { status: 401 }
    );
  }

  // Increment attempts before checking code (prevent timing attacks)
  await prisma.loginCode.update({
    where: { id: loginCode.id },
    data: { attempts: { increment: 1 } },
  });

  // Verify code using timing-safe comparison
  if (!secureCompare(code, loginCode.code)) {
    const remainingAttempts = MAX_CODE_ATTEMPTS - loginCode.attempts - 1;
    
    logger.info({
      module: 'auth',
      operation: 'verifyLoginCode',
      email: normalizedEmail,
      codeId: loginCode.id,
      remainingAttempts,
    }, 'Login code verification failed - incorrect code');

    return NextResponse.json(
      { 
        error: remainingAttempts > 0 
          ? `Incorrect code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`
          : 'Incorrect code. Please request a new login email.',
      },
      { status: 401 }
    );
  }

  // Code is valid! Mark as used
  await prisma.loginCode.update({
    where: { id: loginCode.id },
    data: { used: true },
  });

  // Look up the user
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      memberships: {
        include: {
          practice: {
            select: { 
              id: true, 
              name: true, 
              slug: true, 
              onboardingCompletedAt: true, 
              onboardingSkippedAt: true,
              locations: {
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
              },
            },
          },
          locationAccess: {
            select: { locationId: true },
          },
        },
      },
    },
  });

  if (!user) {
    // User doesn't exist - this shouldn't happen if magic link flow was used
    // But handle gracefully
    logger.warn({
      module: 'auth',
      operation: 'verifyLoginCode',
      email: normalizedEmail,
    }, 'Login code valid but user not found - may need to complete registration');

    return NextResponse.json(
      { error: 'No account found for this email. Please sign up first.' },
      { status: 404 }
    );
  }

  // Success! Create a verification token for NextAuth's callback system
  // This allows us to use NextAuth's built-in session creation logic
  logger.info({
    module: 'auth',
    operation: 'verifyLoginCode',
    email: normalizedEmail,
    userId: user.id,
  }, 'Login code verification successful');

  // Generate a one-time token that NextAuth can verify via callback
  const { randomBytes } = await import('crypto');
  const callbackToken = randomBytes(32).toString('hex');
  
  // Store the token in NextAuth's VerificationToken table
  // NextAuth will consume this when the user hits the callback URL
  const tokenExpires = new Date();
  tokenExpires.setMinutes(tokenExpires.getMinutes() + 5); // 5 minute expiry
  
  // Delete any existing tokens for this email first (NextAuth does this too)
  await prisma.verificationToken.deleteMany({
    where: { identifier: normalizedEmail },
  });
  
  await prisma.verificationToken.create({
    data: {
      identifier: normalizedEmail,
      token: callbackToken,
      expires: tokenExpires,
    },
  });

  // Build the callback URL that NextAuth expects
  // This URL format is: /api/auth/callback/resend?callbackUrl=...&token=...&email=...
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const callbackUrl = new URL('/api/auth/callback/resend', baseUrl);
  callbackUrl.searchParams.set('token', callbackToken);
  callbackUrl.searchParams.set('email', normalizedEmail);
  // Set the post-login redirect
  callbackUrl.searchParams.set('callbackUrl', '/dashboard');

  return NextResponse.json({
    success: true,
    message: 'Code verified successfully',
    // Return the callback URL for the client to navigate to
    callbackUrl: callbackUrl.toString(),
  });
});

