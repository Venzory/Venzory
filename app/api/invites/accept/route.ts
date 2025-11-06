import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { MembershipStatus } from '@prisma/client';

import { signIn } from '@/auth';
import { prisma } from '@/lib/prisma';

const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  name: z.string().min(1, 'Name is required').max(120),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = acceptInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const { token, name, password } = parsed.data;

    // Find and validate invite
    const invite = await prisma.userInvite.findUnique({
      where: { token },
      include: {
        practice: {
          select: { id: true, name: true },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 },
      );
    }

    if (invite.used) {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 409 },
      );
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 410 },
      );
    }

    const normalizedEmail = invite.email.toLowerCase();

    // Hash password
    const passwordHash = await hash(password, 12);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          where: { practiceId: invite.practiceId },
        },
      },
    });

    let userId: string;

    if (existingUser) {
      // User exists - check if already a member
      if (existingUser.memberships.length > 0) {
        return NextResponse.json(
          { error: 'You are already a member of this practice' },
          { status: 409 },
        );
      }

      // User exists but not a member - create membership
      await prisma.$transaction(async (tx) => {
        // Create membership
        await tx.practiceUser.create({
          data: {
            userId: existingUser.id,
            practiceId: invite.practiceId,
            role: invite.role,
            status: MembershipStatus.ACTIVE,
            invitedAt: invite.createdAt,
            acceptedAt: new Date(),
          },
        });

        // Mark invite as used
        await tx.userInvite.update({
          where: { id: invite.id },
          data: { used: true },
        });
      });

      userId = existingUser.id;
    } else {
      // New user - create user and membership
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
          data: {
            name,
            email: normalizedEmail,
            passwordHash,
            memberships: {
              create: {
                practiceId: invite.practiceId,
                role: invite.role,
                status: MembershipStatus.ACTIVE,
                invitedAt: invite.createdAt,
                acceptedAt: new Date(),
              },
            },
          },
        });

        // Mark invite as used
        await tx.userInvite.update({
          where: { id: invite.id },
          data: { used: true },
        });

        return { user: newUser };
      });

      userId = result.user.id;
    }

    // Sign the user in
    try {
      await signIn('credentials', {
        email: normalizedEmail,
        password,
        redirect: false,
      });
    } catch (signInError) {
      // If sign-in fails, log it but still return success since account was created
      console.error('[accept-invite] Auto sign-in failed:', signInError);
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
        redirectTo: '/dashboard',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[accept-invite]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while accepting the invitation' },
      { status: 500 },
    );
  }
}

