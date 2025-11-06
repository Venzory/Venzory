import { NextResponse } from 'next/server';
import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const { session, practiceId } = await requireActivePractice();

    // Mark all notifications as read for current user's practice
    // Only mark notifications that are for all users (userId = null) OR for the current user
    await prisma.inAppNotification.updateMany({
      where: {
        practiceId,
        read: false,
        OR: [
          { userId: null },
          { userId: session.user.id },
        ],
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}

