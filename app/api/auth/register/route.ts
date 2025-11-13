import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthService } from '@/src/services';
import { apiHandler } from '@/lib/api-handler';
import { ValidationError } from '@/src/domain/errors';

const registerSchema = z.object({
  practiceName: z.string().min(2, 'Practice name is required').max(120),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(120),
});

export const POST = apiHandler(async (request: Request) => {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid input', parsed.error.flatten().fieldErrors);
  }

  const { practiceName, email, password, name } = parsed.data;

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

