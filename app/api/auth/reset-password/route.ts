import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthService } from '@/src/services';
import { apiHandler } from '@/lib/api-handler';
import { ValidationError } from '@/src/domain/errors';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const POST = apiHandler(async (request: Request) => {
  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid input', parsed.error.flatten().fieldErrors);
  }

  const { token, password } = parsed.data;

  // Reset password using AuthService (throws ValidationError if token invalid/expired)
  const result = await getAuthService().resetPassword(token, password);

  return NextResponse.json(
    { message: result.message },
    { status: 200 },
  );
});

