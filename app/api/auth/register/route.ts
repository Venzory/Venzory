import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthService } from '@/src/services';
import { registerRateLimiter, getClientIp } from '@/lib/rate-limit';
import { apiHandler } from '@/lib/api-handler';
import { ValidationError, RateLimitError } from '@/src/domain/errors';
import { verifyCsrf } from '@/lib/csrf';

const registerSchema = z.object({
  practiceName: z.string().min(2, 'Practice name is required').max(120),
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  name: z.string().min(1, 'Name is required').max(120),
});

export const POST = apiHandler(async (request: Request) => {
  // Enforce CSRF protection explicitly (bypass enabled for /api/auth/* in apiHandler)
  const isCsrfValid = await verifyCsrf(request);
  if (!isCsrfValid) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid input', parsed.error.flatten().fieldErrors);
  }

  const { practiceName, email, password, name } = parsed.data;

  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitResult = await registerRateLimiter.check(clientIp);

  if (!rateLimitResult.success) {
    throw new RateLimitError('Too many registration attempts. Please try again later.', {
      limit: rateLimitResult.limit,
      remaining: rateLimitResult.remaining,
      reset: rateLimitResult.reset,
    });
  }

  // Register practice using AuthService (throws ConflictError if user exists)
  const result = await getAuthService().registerPractice(
    practiceName,
    email,
    password,
    name
  );

  return NextResponse.json(
    {
      practice: result.practice,
      user: result.user,
    },
    { status: 201 },
  );
});

