import { NextResponse } from 'next/server';
import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getNotificationService } from '@/src/services';
import { apiHandler } from '@/lib/api-handler';

export const POST = apiHandler(async () => {
  const { session } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

  // Mark all notifications as read using NotificationService
  const result = await getNotificationService().markAllAsRead(ctx);

  return NextResponse.json({ success: true, count: result.count });
});


