import { NextResponse } from 'next/server';
import { requireActivePractice } from '@/lib/auth';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getNotificationService } from '@/src/services';
import { apiHandlerContext } from '@/lib/api-handler';

export const PATCH = apiHandlerContext(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  await requireActivePractice();
  const ctx = await buildRequestContext();
  const { id } = await params;

  // Mark as read using NotificationService (includes tenant scoping verification)
  const updated = await getNotificationService().markAsRead(ctx, id);

  return NextResponse.json(updated);
});

