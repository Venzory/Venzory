import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { PracticeRole } from '@prisma/client';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/rbac';
import { sendUserInviteEmail } from '@/lib/email';

const createInviteSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.nativeEnum(PracticeRole),
  name: z.string().optional(),
  practiceId: z.string().min(1, 'Practice ID required'),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'You must be signed in to invite users' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = createInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const { email, role, name, practiceId } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Check if user is admin of the practice
    const isAdmin = hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.ADMIN,
    });

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'You must be an admin to invite users to this practice' },
        { status: 403 },
      );
    }

    // Get practice details
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: { id: true, name: true },
    });

    if (!practice) {
      return NextResponse.json(
        { error: 'Practice not found' },
        { status: 404 },
      );
    }

    // Check if user already exists and is a member
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          where: { practiceId },
        },
      },
    });

    if (existingUser && existingUser.memberships.length > 0) {
      return NextResponse.json(
        { error: 'This user is already a member of your practice' },
        { status: 409 },
      );
    }

    // Check for existing unused invite
    const existingInvite = await prisma.userInvite.findFirst({
      where: {
        email: normalizedEmail,
        practiceId,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An active invitation already exists for this email' },
        { status: 409 },
      );
    }

    // Generate secure random token
    const token = randomBytes(32).toString('hex');

    // Calculate expiration time (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invite in database
    const invite = await prisma.userInvite.create({
      data: {
        token,
        email: normalizedEmail,
        practiceId,
        role,
        inviterName: name || null,
        expiresAt,
        used: false,
      },
    });

    // Send invitation email
    const emailResult = await sendUserInviteEmail({
      email: normalizedEmail,
      token,
      practiceName: practice.name,
      role,
      inviterName: session.user.name || undefined,
    });

    if (!emailResult.success) {
      console.error('[create-invite] Failed to send email:', emailResult.error);
      // Note: We don't fail the request if email fails - invite is still created
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Invitation sent successfully',
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[create-invite]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the invitation' },
      { status: 500 },
    );
  }
}

