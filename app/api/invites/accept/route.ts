import { NextResponse } from 'next/server';
import { z } from 'zod';

import { signIn } from '@/auth';
import { getAuthService } from '@/src/services';
import { inviteAcceptRateLimiter, getClientIp } from '@/lib/rate-limit';
import { apiHandler } from '@/lib/api-handler';
import { ValidationError, RateLimitError } from '@/src/domain/errors';
import logger from '@/lib/logger';
import { verifyCsrf } from '@/lib/csrf';

const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  name: z.string().min(1, 'Name is required').max(120),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

export const POST = apiHandler(async (request: Request) => {
  // Enforce CSRF protection explicitly
  const isCsrfValid = await verifyCsrf(request);
  if (!isCsrfValid) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = acceptInviteSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid input', parsed.error.flatten().fieldErrors);
  }

  const { token, name, password } = parsed.data;

  // Rate limiting: Check based on IP and token
  const clientIp = getClientIp(request);
  const rateLimitKey = `${clientIp}:${token}`;
  const rateLimitResult = await inviteAcceptRateLimiter.check(rateLimitKey);

  if (!rateLimitResult.success) {
    throw new RateLimitError('Too many attempts. Please try again later.', {
      limit: rateLimitResult.limit,
      remaining: rateLimitResult.remaining,
      reset: rateLimitResult.reset,
    });
  }

  // Accept invite using AuthService (throws NotFoundError, ConflictError, ValidationError as needed)
  const result = await getAuthService().acceptInvite(token, name, password);

  // Sign the user in
  try {
    await signIn('credentials', {
      email: result.email,
      password,
      redirect: false,
    });
  } catch (signInError) {
    // If sign-in fails, log it but still return success since account was created
    logger.warn({
      msg: 'Auto sign-in failed after accepting invite',
      error: signInError instanceof Error ? signInError.message : String(signInError),
    });
    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully. Please sign in.',
        redirectTo: '/login',
      },
      { status: 201 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Invitation accepted successfully',
      redirectTo: result.redirectTo,
    },
    { status: 200 },
  );
});

