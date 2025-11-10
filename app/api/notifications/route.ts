import { NextResponse } from 'next/server';
import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getNotificationService } from '@/src/services';

export async function GET() {
  try {
    const { session, practiceId } = await requireActivePractice();
    const ctx = buildRequestContextFromSession(session);

    // Fetch recent notifications using NotificationService
    const [notifications, unreadCount] = await Promise.all([
      getNotificationService().getNotifications(ctx, 10),
      getNotificationService().getUnreadCount(ctx),
    ]);

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


