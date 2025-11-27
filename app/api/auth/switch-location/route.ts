import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { z } from 'zod';

const switchLocationSchema = z.object({
  locationId: z.string().min(1),
});

// Cookie name for storing active location
export const ACTIVE_LOCATION_COOKIE = 'venzory-active-location';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { locationId } = switchLocationSchema.parse(body);

    // Get current membership
    const memberships = session.user.memberships ?? [];
    const activePracticeId = session.user.activePracticeId;
    const activeMembership = memberships.find((m) => m.practiceId === activePracticeId);

    if (!activeMembership) {
      return NextResponse.json({ error: 'No active membership' }, { status: 400 });
    }

    // Handle "all" locations option for OWNER/ADMIN
    if (locationId === 'all') {
      if (activeMembership.role !== 'OWNER' && activeMembership.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Only owners and admins can view all locations' },
          { status: 403 }
        );
      }

      // Clear the cookie to indicate "all locations"
      const cookieStore = await cookies();
      cookieStore.delete(ACTIVE_LOCATION_COOKIE);

      return NextResponse.json({ success: true, locationId: null });
    }

    // Validate user has access to this location
    const allowedLocationIds = activeMembership.allowedLocationIds ?? [];

    // OWNER and ADMIN have access to all locations
    const hasAccess =
      activeMembership.role === 'OWNER' ||
      activeMembership.role === 'ADMIN' ||
      allowedLocationIds.includes(locationId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No access to this location' },
        { status: 403 }
      );
    }

    // Set the cookie with the new active location
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_LOCATION_COOKIE, locationId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ success: true, locationId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error switching location:', error);
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
    const activeLocationCookie = cookieStore.get(ACTIVE_LOCATION_COOKIE);
    
    return NextResponse.json({
      activeLocationId: activeLocationCookie?.value ?? null,
    });
  } catch (error) {
    console.error('Error getting active location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

