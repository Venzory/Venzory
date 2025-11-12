import { NextResponse } from 'next/server';
import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getNotificationService } from '@/src/services';
import { apiHandler } from '@/lib/api-handler';

export const GET = apiHandler(async () => {
  const { session } = await requireActivePractice();
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
});


