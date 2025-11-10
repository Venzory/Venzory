import { NextResponse } from 'next/server';
import { requireActivePractice } from '@/lib/auth';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getNotificationService } from '@/src/services';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, practiceId } = await requireActivePractice();
    const ctx = await buildRequestContext();
    const { id } = await params;

    // Mark as read using NotificationService (includes tenant scoping verification)
    const updated = await getNotificationService().markAsRead(ctx, id);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    
    // Handle not found error
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

