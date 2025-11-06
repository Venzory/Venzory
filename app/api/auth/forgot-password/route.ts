import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';

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

    // Look up user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Anti-enumeration: Always return success message regardless of whether user exists
    // This prevents attackers from discovering which emails are registered
    if (!user || !user.passwordHash) {
      // Still return success to prevent user enumeration
      return NextResponse.json(
        {
          message:
            'If an account exists with that email, you will receive a password reset link shortly.',
        },
        { status: 200 },
      );
    }

    // Generate secure random token
    const token = randomBytes(32).toString('hex');

    // Calculate expiration time (60 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 60);

    // Store token in database
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
        used: false,
      },
    });

    // Send password reset email
    const emailResult = await sendPasswordResetEmail({
      email: user.email,
      token,
      name: user.name,
    });

    if (!emailResult.success) {
      console.error('[forgot-password] Failed to send email:', emailResult.error);
      // Don't expose email sending failure to user for security
    }

    return NextResponse.json(
      {
        message:
          'If an account exists with that email, you will receive a password reset link shortly.',
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

