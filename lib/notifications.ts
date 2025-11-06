import { PracticeRole, Prisma } from '@prisma/client';
import { prisma } from './prisma';

export type NotificationType = 'ORDER_SENT' | 'ORDER_RECEIVED' | 'LOW_STOCK';

interface CreateNotificationParams {
  practiceId: string;
  userId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
  itemId?: string;
  locationId?: string;
}

/**
 * Create notification for specific user or all ADMIN + STAFF users in a practice.
 * Works within a Prisma transaction.
 */
export async function createNotificationForPracticeUsers(
  params: CreateNotificationParams,
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  const { practiceId, userId, type, title, message, orderId, itemId, locationId } = params;

  // If userId is specified, create notification only for that user
  if (userId) {
    await db.inAppNotification.create({
      data: {
        practiceId,
        userId,
        type,
        title,
        message,
        orderId,
        itemId,
        locationId,
      },
    });
    return;
  }

  // Otherwise, create notification for all ADMIN + STAFF users in the practice
  const practiceUsers = await db.practiceUser.findMany({
    where: {
      practiceId,
      role: {
        in: [PracticeRole.ADMIN, PracticeRole.STAFF],
      },
      status: 'ACTIVE',
    },
    select: {
      userId: true,
    },
  });

  // Create a notification for each eligible user
  await db.inAppNotification.createMany({
    data: practiceUsers.map((pu) => ({
      practiceId,
      userId: pu.userId,
      type,
      title,
      message,
      orderId,
      itemId,
      locationId,
    })),
  });
}

/**
 * Check if an item at a location has dropped below its reorder point
 * and create a LOW_STOCK notification if needed.
 * Works within a Prisma transaction.
 */
export async function checkAndCreateLowStockNotification(
  params: {
    practiceId: string;
    itemId: string;
    locationId: string;
    newQuantity: number;
    reorderPoint: number | null;
  },
  tx?: Prisma.TransactionClient
) {
  const db = tx ?? prisma;
  const { practiceId, itemId, locationId, newQuantity, reorderPoint } = params;

  // Only create notification if reorderPoint is set and quantity is below it
  if (reorderPoint === null || newQuantity >= reorderPoint) {
    return;
  }

  // Fetch item and location names for the notification message
  const [item, location] = await Promise.all([
    db.item.findUnique({
      where: { id: itemId },
      select: { name: true },
    }),
    db.location.findUnique({
      where: { id: locationId },
      select: { name: true },
    }),
  ]);

  if (!item || !location) {
    return;
  }

  // Check if we already have a recent unread LOW_STOCK notification for this item/location
  // to avoid spamming duplicate notifications
  const recentNotification = await db.inAppNotification.findFirst({
    where: {
      practiceId,
      type: 'LOW_STOCK',
      itemId,
      locationId,
      read: false,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
      },
    },
  });

  if (recentNotification) {
    // Already have a recent unread notification, don't create duplicate
    return;
  }

  // Create notification for all ADMIN + STAFF users
  await createNotificationForPracticeUsers(
    {
      practiceId,
      type: 'LOW_STOCK',
      title: `Low stock: ${item.name}`,
      message: `Location "${location.name}" is below its reorder point (${newQuantity} < ${reorderPoint}).`,
      itemId,
      locationId,
    },
    tx
  );
}

