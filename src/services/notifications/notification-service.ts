/**
 * Notification Service
 * Handles in-app notification management with tenant scoping
 */

import { InAppNotification } from '@prisma/client';
import { RequestContext } from '@/src/lib/context/request-context';
import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/src/domain/errors';

/**
 * Service interface for notification operations
 */
interface INotificationService {
  getNotifications(ctx: RequestContext, limit?: number): Promise<InAppNotification[]>;
  getUnreadCount(ctx: RequestContext): Promise<number>;
  markAsRead(ctx: RequestContext, notificationId: string): Promise<InAppNotification>;
  markAllAsRead(ctx: RequestContext): Promise<{ count: number }>;
}

/**
 * Implementation of notification service
 * All methods automatically scope to user's practice
 */
class NotificationServiceImpl implements INotificationService {
  /**
   * Get recent notifications for the current user/practice
   * Returns notifications that are either for all users (userId = null) or for the current user
   */
  async getNotifications(ctx: RequestContext, limit = 10): Promise<InAppNotification[]> {
    return prisma.inAppNotification.findMany({
      where: {
        practiceId: ctx.practiceId,
        OR: [
          { userId: null }, // Global notifications for all users in practice
          { userId: ctx.userId }, // User-specific notifications
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get count of unread notifications for current user
   */
  async getUnreadCount(ctx: RequestContext): Promise<number> {
    return prisma.inAppNotification.count({
      where: {
        practiceId: ctx.practiceId,
        read: false,
        OR: [
          { userId: null },
          { userId: ctx.userId },
        ],
      },
    });
  }

  /**
   * Mark a single notification as read
   * Verifies notification belongs to user's practice before updating
   */
  async markAsRead(ctx: RequestContext, notificationId: string): Promise<InAppNotification> {
    // Verify the notification belongs to the user's practice
    const notification = await prisma.inAppNotification.findUnique({
      where: { id: notificationId },
      select: { practiceId: true },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.practiceId !== ctx.practiceId) {
      throw new NotFoundError('Notification not found');
    }

    // Mark as read
    return prisma.inAppNotification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  /**
   * Mark all notifications as read for the current user in their practice
   * Only marks notifications that are for all users OR for the current user
   */
  async markAllAsRead(ctx: RequestContext): Promise<{ count: number }> {
    const result = await prisma.inAppNotification.updateMany({
      where: {
        practiceId: ctx.practiceId,
        read: false,
        OR: [
          { userId: null },
          { userId: ctx.userId },
        ],
      },
      data: {
        read: true,
      },
    });

    return { count: result.count };
  }
}

// Singleton instance
let notificationServiceInstance: INotificationService | null = null;

/**
 * Get singleton instance of NotificationService
 */
export function getNotificationService(): INotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationServiceImpl();
  }
  return notificationServiceInstance;
}

export type { INotificationService };

