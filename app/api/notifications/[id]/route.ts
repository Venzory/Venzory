import { NextResponse } from 'next/server';
import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { practiceId } = await requireActivePractice();
    const { id } = await params;

    // Verify the notification belongs to the user's practice
    const notification = await prisma.inAppNotification.findUnique({
      where: { id },
      select: { practiceId: true },
    });

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (notification.practiceId !== practiceId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Mark as read
    const updated = await prisma.inAppNotification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

