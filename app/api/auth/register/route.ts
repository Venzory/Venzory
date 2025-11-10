import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthService } from '@/src/services';

const registerSchema = z.object({
  practiceName: z.string().min(2, 'Practice name is required').max(120),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(120),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const { practiceName, email, password, name } = parsed.data;

    // Register practice using AuthService
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
  } catch (error) {
    console.error('[register]', error);
    
    // Handle specific errors
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: 'A user with this email already exists. Please sign in instead.' },
        { status: 409 },
      );
    }
    
    return NextResponse.json(
      { error: 'Unexpected error creating practice' },
      { status: 500 },
    );
  }
}

