import { NextResponse } from 'next/server';
import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { session, practiceId } = await requireActivePractice();

    // Fetch recent notifications (last 10) for current user's practice
    // Include notifications where userId is null (for all users) OR userId matches current user
    const notifications = await prisma.inAppNotification.findMany({
      where: {
        practiceId,
        OR: [
          { userId: null },
          { userId: session.user.id },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Count unread notifications
    const unreadCount = await prisma.inAppNotification.count({
      where: {
        practiceId,
        read: false,
        OR: [
          { userId: null },
          { userId: session.user.id },
        ],
      },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

