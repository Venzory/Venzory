import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PracticeRole } from '@prisma/client';

import { auth } from '@/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getSettingsService } from '@/src/services';

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

    // Build request context for service call
    const ctx = buildRequestContextFromSession(session);

    // Create invite using SettingsService (includes RBAC and all validations)
    const invite = await getSettingsService().createInvite(ctx, {
      email,
      role,
      inviterName: name || null,
    });

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
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('already a member')) {
        return NextResponse.json(
          { error: 'This user is already a member of your practice' },
          { status: 409 },
        );
      }
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'An active invitation already exists for this email' },
          { status: 409 },
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Practice not found' },
          { status: 404 },
        );
      }
      if (error.message.includes('Insufficient permissions')) {
        return NextResponse.json(
          { error: 'You must be an admin to invite users to this practice' },
          { status: 403 },
        );
      }
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the invitation' },
      { status: 500 },
    );
  }
}


