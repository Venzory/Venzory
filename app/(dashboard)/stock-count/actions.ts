'use server';

import { PracticeRole, StockCountStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/rbac';
import { checkAndCreateLowStockNotification } from '@/lib/notifications';

const createStockCountSessionSchema = z.object({
  locationId: z.string().min(1, 'Location is required'),
  notes: z.string().max(512).optional().transform((value) => value?.trim() || null),
});

const addCountLineSchema = z.object({
  sessionId: z.string().min(1),
  itemId: z.string().min(1),
  countedQuantity: z.coerce.number().int().min(0),
  notes: z.string().max(256).optional().transform((value) => value?.trim() || null),
});

const updateCountLineSchema = z.object({
  lineId: z.string().min(1),
  countedQuantity: z.coerce.number().int().min(0),
  notes: z.string().max(256).optional().transform((value) => value?.trim() || null),
});

const completeStockCountSchema = z.object({
  sessionId: z.string().min(1),
  applyAdjustments: z.boolean().default(false),
});

export async function createStockCountSessionAction(_prevState: unknown, formData: FormData) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    })
  ) {
    return { error: 'Insufficient permissions' } as const;
  }

  const parsed = createStockCountSessionSchema.safeParse({
    locationId: formData.get('locationId'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { error: 'Invalid session details' } as const;
  }

  const { locationId, notes } = parsed.data;

  // Verify location belongs to practice
  const location = await prisma.location.findUnique({
    where: { id: locationId, practiceId },
  });

  if (!location) {
    return { error: 'Location not found' } as const;
  }

  const countSession = await prisma.stockCountSession.create({
    data: {
      practiceId,
      locationId,
      notes,
      status: StockCountStatus.IN_PROGRESS,
      createdById: session.user.id,
    },
  });

  revalidatePath('/stock-count');
  return { success: true, sessionId: countSession.id } as const;
}

export async function addCountLineAction(_prevState: unknown, formData: FormData) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    })
  ) {
    return { error: 'Insufficient permissions' } as const;
  }

  const parsed = addCountLineSchema.safeParse({
    sessionId: formData.get('sessionId'),
    itemId: formData.get('itemId'),
    countedQuantity: formData.get('countedQuantity'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { error: 'Invalid line details' } as const;
  }

  const { sessionId, itemId, countedQuantity, notes } = parsed.data;

  // Verify session exists and is IN_PROGRESS
  const countSession = await prisma.stockCountSession.findUnique({
    where: { id: sessionId, practiceId },
  });

  if (!countSession) {
    return { error: 'Session not found' } as const;
  }

  if (countSession.status !== StockCountStatus.IN_PROGRESS) {
    return { error: 'Cannot edit completed session' } as const;
  }

  // Verify item belongs to practice
  const item = await prisma.item.findUnique({
    where: { id: itemId, practiceId },
  });

  if (!item) {
    return { error: 'Item not found' } as const;
  }

  // Get current system quantity from LocationInventory
  const inventory = await prisma.locationInventory.findUnique({
    where: {
      locationId_itemId: {
        locationId: countSession.locationId,
        itemId,
      },
    },
  });

  const systemQuantity = inventory?.quantity ?? 0;
  const variance = countedQuantity - systemQuantity;

  // Check if line already exists for this item
  const existingLine = await prisma.stockCountLine.findFirst({
    where: {
      sessionId,
      itemId,
    },
  });

  if (existingLine) {
    // Update existing line
    const line = await prisma.stockCountLine.update({
      where: { id: existingLine.id },
      data: {
        countedQuantity,
        systemQuantity,
        variance,
        notes: notes || existingLine.notes,
      },
    });

    revalidatePath(`/stock-count/${sessionId}`);
    return { success: true, variance, lineId: line.id } as const;
  }

  // Create new line
  const line = await prisma.stockCountLine.create({
    data: {
      sessionId,
      itemId,
      countedQuantity,
      systemQuantity,
      variance,
      notes,
    },
  });

  revalidatePath(`/stock-count/${sessionId}`);
  return { success: true, variance, lineId: line.id } as const;
}

export async function updateCountLineAction(_prevState: unknown, formData: FormData) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    })
  ) {
    return { error: 'Insufficient permissions' } as const;
  }

  const parsed = updateCountLineSchema.safeParse({
    lineId: formData.get('lineId'),
    countedQuantity: formData.get('countedQuantity'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { error: 'Invalid line details' } as const;
  }

  const { lineId, countedQuantity, notes } = parsed.data;

  // Verify line exists and session is IN_PROGRESS
  const line = await prisma.stockCountLine.findUnique({
    where: { id: lineId },
    include: {
      session: true,
    },
  });

  if (!line || line.session.practiceId !== practiceId) {
    return { error: 'Line not found' } as const;
  }

  if (line.session.status !== StockCountStatus.IN_PROGRESS) {
    return { error: 'Cannot edit completed session' } as const;
  }

  // Recalculate variance
  const variance = countedQuantity - line.systemQuantity;

  await prisma.stockCountLine.update({
    where: { id: lineId },
    data: {
      countedQuantity,
      variance,
      notes,
    },
  });

  revalidatePath(`/stock-count/${line.sessionId}`);
  return { success: true, variance } as const;
}

export async function removeCountLineAction(lineId: string) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    })
  ) {
    throw new Error('Insufficient permissions');
  }

  // Verify line exists and session is IN_PROGRESS
  const line = await prisma.stockCountLine.findUnique({
    where: { id: lineId },
    include: {
      session: true,
    },
  });

  if (!line || line.session.practiceId !== practiceId) {
    throw new Error('Line not found');
  }

  if (line.session.status !== StockCountStatus.IN_PROGRESS) {
    throw new Error('Cannot edit completed session');
  }

  await prisma.stockCountLine.delete({
    where: { id: lineId },
  });

  revalidatePath(`/stock-count/${line.sessionId}`);
}

export async function completeStockCountAction(sessionId: string, applyAdjustments: boolean) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    })
  ) {
    throw new Error('Insufficient permissions');
  }

  // Fetch session with lines
  const countSession = await prisma.stockCountSession.findUnique({
    where: { id: sessionId, practiceId },
    include: {
      lines: {
        include: {
          item: true,
        },
      },
    },
  });

  if (!countSession) {
    throw new Error('Session not found');
  }

  if (countSession.status !== StockCountStatus.IN_PROGRESS) {
    throw new Error('Session is not in progress');
  }

  if (countSession.lines.length === 0) {
    throw new Error('Session must have at least one line');
  }

  let adjustedItems = 0;

  // Process session in a transaction
  await prisma.$transaction(async (tx) => {
    if (applyAdjustments) {
      // Apply adjustments for lines with variance
      for (const line of countSession.lines) {
        if (line.variance === 0) {
          continue; // Skip items with no variance
        }

        // Update LocationInventory
        const existingInventory = await tx.locationInventory.findUnique({
          where: {
            locationId_itemId: {
              locationId: countSession.locationId,
              itemId: line.itemId,
            },
          },
        });

        const reorderPoint = existingInventory?.reorderPoint ?? null;

        await tx.locationInventory.upsert({
          where: {
            locationId_itemId: {
              locationId: countSession.locationId,
              itemId: line.itemId,
            },
          },
          create: {
            locationId: countSession.locationId,
            itemId: line.itemId,
            quantity: line.countedQuantity,
          },
          update: {
            quantity: line.countedQuantity,
          },
        });

        // Create StockAdjustment
        await tx.stockAdjustment.create({
          data: {
            itemId: line.itemId,
            locationId: countSession.locationId,
            practiceId,
            quantity: line.variance,
            reason: 'Stock Count',
            note: `Count session #${sessionId.slice(0, 8)}${line.notes ? ` - ${line.notes}` : ''}`,
            createdById: session.user.id,
          },
        });

        // Check for low stock after adjustment
        await checkAndCreateLowStockNotification(
          {
            practiceId,
            itemId: line.itemId,
            locationId: countSession.locationId,
            newQuantity: line.countedQuantity,
            reorderPoint,
          },
          tx
        );

        adjustedItems++;
      }
    }

    // Mark session as COMPLETED
    await tx.stockCountSession.update({
      where: { id: sessionId },
      data: {
        status: StockCountStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // Create AuditLog entry
    const totalVariance = countSession.lines.reduce(
      (sum, line) => sum + Math.abs(line.variance),
      0
    );

    await tx.auditLog.create({
      data: {
        practiceId,
        actorId: session.user.id,
        entityType: 'StockCountSession',
        entityId: sessionId,
        action: 'COMPLETED',
        changes: {
          lineCount: countSession.lines.length,
          adjustmentsApplied: applyAdjustments,
          adjustedItemCount: adjustedItems,
          totalVariance,
          items: countSession.lines.map((line) => ({
            itemId: line.itemId,
            itemName: line.item.name,
            systemQuantity: line.systemQuantity,
            countedQuantity: line.countedQuantity,
            variance: line.variance,
          })),
        },
        metadata: {
          locationId: countSession.locationId,
        },
      },
    });
  });

  revalidatePath('/stock-count');
  revalidatePath(`/stock-count/${sessionId}`);
  revalidatePath('/inventory');

  return { success: true, adjustedItems } as const;
}

export async function cancelStockCountAction(sessionId: string) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    })
  ) {
    throw new Error('Insufficient permissions');
  }

  // Verify session exists and is IN_PROGRESS
  const countSession = await prisma.stockCountSession.findUnique({
    where: { id: sessionId, practiceId },
  });

  if (!countSession) {
    throw new Error('Session not found');
  }

  if (countSession.status !== StockCountStatus.IN_PROGRESS) {
    throw new Error('Can only cancel in-progress sessions');
  }

  await prisma.stockCountSession.update({
    where: { id: sessionId },
    data: {
      status: StockCountStatus.CANCELLED,
    },
  });

  revalidatePath('/stock-count');
  revalidatePath(`/stock-count/${sessionId}`);
}

export async function deleteStockCountSessionAction(sessionId: string) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.ADMIN,
    })
  ) {
    throw new Error('Insufficient permissions');
  }

  // Verify session exists and is not COMPLETED with adjustments
  const countSession = await prisma.stockCountSession.findUnique({
    where: { id: sessionId, practiceId },
  });

  if (!countSession) {
    throw new Error('Session not found');
  }

  if (countSession.status === StockCountStatus.COMPLETED) {
    throw new Error('Cannot delete completed session');
  }

  await prisma.stockCountSession.delete({
    where: { id: sessionId },
  });

  revalidatePath('/stock-count');
  redirect('/stock-count');
}

