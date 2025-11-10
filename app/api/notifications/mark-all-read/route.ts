import { NextResponse } from 'next/server';
import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getNotificationService } from '@/src/services';

export async function POST() {
  try {
    const { session, practiceId } = await requireActivePractice();
    const ctx = buildRequestContextFromSession(session);

    // Mark all notifications as read using NotificationService
    const result = await getNotificationService().markAllAsRead(ctx);

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}


