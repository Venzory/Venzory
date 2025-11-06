import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

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

    // Look up token from database
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Validate token exists, not used, and not expired
    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 },
      );
    }

    if (resetToken.used) {
      return NextResponse.json(
        { error: 'This reset token has already been used' },
        { status: 400 },
      );
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json(
        { error: 'This reset token has expired' },
        { status: 400 },
      );
    }

    // Hash new password using bcryptjs with 12 rounds (matching existing pattern)
    const passwordHash = await hash(password, 12);

    // Update user's password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json(
      { message: 'Password reset successfully' },
      { status: 200 },
    );
  } catch (error) {
    console.error('[reset-password]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}

