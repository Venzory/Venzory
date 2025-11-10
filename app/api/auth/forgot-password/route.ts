import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthService } from '@/src/services';
import { passwordResetRateLimiter, getClientIp } from '@/lib/rate-limit';

const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email required'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Rate limiting: Check both IP and email
    const clientIp = getClientIp(request);
    const rateLimitKey = `${clientIp}:${normalizedEmail}`;
    const rateLimitResult = await passwordResetRateLimiter.check(rateLimitKey);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many password reset requests. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        },
      );
    }

    // Request password reset using AuthService
    const result = await getAuthService().requestPasswordReset(normalizedEmail);

    return NextResponse.json(
      {
        message: result.message,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[forgot-password]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}

