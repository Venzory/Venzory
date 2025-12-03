import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { z } from 'zod';

const switchPracticeSchema = z.object({
  practiceId: z.string().min(1),
});

// Cookie names for storing active context
export const ACTIVE_PRACTICE_COOKIE = 'venzory-active-practice';
export const ACTIVE_LOCATION_COOKIE = 'venzory-active-location';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { practiceId } = switchPracticeSchema.parse(body);

    // Verify user has access to this practice
    const memberships = session.user.memberships ?? [];
    const targetMembership = memberships.find((m) => m.practiceId === practiceId);

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'No access to this practice' },
        { status: 403 }
      );
    }

    // Check membership status
    if (targetMembership.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Membership is not active' },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();

    // Set the practice cookie
    cookieStore.set(ACTIVE_PRACTICE_COOKIE, practiceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Set default location to first allowed location in the new practice
    const firstLocationId = targetMembership.allowedLocationIds[0] ?? null;
    
    if (firstLocationId) {
      cookieStore.set(ACTIVE_LOCATION_COOKIE, firstLocationId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    } else {
      // Clear location cookie if no locations
      cookieStore.delete(ACTIVE_LOCATION_COOKIE);
    }

    return NextResponse.json({
      success: true,
      practiceId,
      locationId: firstLocationId,
      practice: {
        id: targetMembership.practice.id,
        name: targetMembership.practice.name,
        slug: targetMembership.practice.slug,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error switching practice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const activePracticeCookie = cookieStore.get(ACTIVE_PRACTICE_COOKIE);
    const activeLocationCookie = cookieStore.get(ACTIVE_LOCATION_COOKIE);

    // Validate that the stored practice is still accessible
    const memberships = session.user.memberships ?? [];
    const storedPracticeId = activePracticeCookie?.value;
    
    let validPracticeId = storedPracticeId;
    let validLocationId = activeLocationCookie?.value ?? null;
    
    if (storedPracticeId) {
      const membership = memberships.find((m) => m.practiceId === storedPracticeId);
      if (!membership || membership.status !== 'ACTIVE') {
        // Stored practice is no longer accessible, fall back to first available
        validPracticeId = memberships[0]?.practiceId ?? null;
        validLocationId = memberships[0]?.allowedLocationIds[0] ?? null;
      }
    } else if (memberships.length > 0) {
      // No stored practice, use first available
      validPracticeId = memberships[0].practiceId;
      validLocationId = memberships[0].allowedLocationIds[0] ?? null;
    }

    return NextResponse.json({
      activePracticeId: validPracticeId ?? null,
      activeLocationId: validLocationId,
    });
  } catch (error) {
    console.error('Error getting active practice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

