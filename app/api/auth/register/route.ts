import { NextResponse } from 'next/server';
import { MembershipStatus, PracticeRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { generateUniquePracticeSlug } from '@/lib/slug';

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
    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists. Please sign in instead.' },
        { status: 409 },
      );
    }

    const slug = await generateUniquePracticeSlug(practiceName);
    const passwordHash = await hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const practice = await tx.practice.create({
        data: {
          name: practiceName,
          slug,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          memberships: {
            create: {
              practiceId: practice.id,
              role: PracticeRole.ADMIN,
              status: MembershipStatus.ACTIVE,
              invitedAt: new Date(),
              acceptedAt: new Date(),
            },
          },
        },
      });

      return { practice, user };
    });

    return NextResponse.json(
      {
        practice: {
          id: result.practice.id,
          name: result.practice.name,
          slug: result.practice.slug,
        },
        user: {
          id: result.user.id,
          email: result.user.email,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[register]', error);
    return NextResponse.json(
      { error: 'Unexpected error creating practice' },
      { status: 500 },
    );
  }
}

