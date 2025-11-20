import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PracticeRole } from '@prisma/client';

import { auth } from '@/auth';
import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getSettingsService } from '@/src/services';
import { apiHandler } from '@/lib/api-handler';
import { ValidationError, UnauthorizedError } from '@/src/domain/errors';

const createInviteSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.nativeEnum(PracticeRole),
  name: z.string().optional(),
  practiceId: z.string().min(1, 'Practice ID required'),
});

export const POST = apiHandler(async (request: Request) => {
  const { session } = await requireActivePractice();

  const body = await request.json();
  const parsed = createInviteSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError('Invalid input', parsed.error.flatten().fieldErrors);
  }

  const { email, role, name } = parsed.data;

  // Build request context for service call
  const ctx = buildRequestContextFromSession(session);

  // Create invite using SettingsService (includes RBAC and all validations)
  // Service throws ConflictError, NotFoundError, or ForbiddenError as appropriate
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
});


