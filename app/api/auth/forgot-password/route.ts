import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthService } from '@/src/services';
import { passwordResetRateLimiter, getClientIp } from '@/lib/rate-limit';
import { apiHandler } from '@/lib/api-handler';
import { ValidationError, RateLimitError } from '@/src/domain/errors';

const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email required'),
});

export const POST = apiHandler(async (request: Request) => {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid input', parsed.error.flatten().fieldErrors);
  }

  const { email } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  // Rate limiting: Check both IP and email
  const clientIp = getClientIp(request);
  const rateLimitKey = `${clientIp}:${normalizedEmail}`;
  const rateLimitResult = await passwordResetRateLimiter.check(rateLimitKey);

  if (!rateLimitResult.success) {
    throw new RateLimitError('Too many password reset requests. Please try again later.', {
      limit: rateLimitResult.limit,
      remaining: rateLimitResult.remaining,
      reset: rateLimitResult.reset,
    });
  }

  // Request password reset using AuthService
  const result = await getAuthService().requestPasswordReset(normalizedEmail);

  return NextResponse.json(
    {
      message: result.message,
    },
    { status: 200 },
  );
});

