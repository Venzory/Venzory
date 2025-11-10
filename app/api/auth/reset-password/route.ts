import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthService } from '@/src/services';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const { token, password } = parsed.data;

    // Reset password using AuthService
    const result = await getAuthService().resetPassword(token, password);

    return NextResponse.json(
      { message: result.message },
      { status: 200 },
    );
  } catch (error) {
    console.error('[reset-password]', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Invalid or expired') || 
          error.message.includes('already been used') || 
          error.message.includes('expired')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 },
        );
      }
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}

