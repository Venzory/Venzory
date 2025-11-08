'use server';

import { PracticeRole, GoodsReceiptStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/rbac';
import { checkAndCreateLowStockNotification } from '@/lib/notifications';

const createGoodsReceiptSchema = z.object({
  locationId: z.string().min(1, 'Location is required'),
  orderId: z.string().optional().nullable().transform((value) => value || null),
  supplierId: z.string().optional().nullable().transform((value) => value || null),
  notes: z.string().max(512).optional().transform((value) => value?.trim() || null),
});

const addReceiptLineSchema = z.object({
  receiptId: z.string().min(1),
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  batchNumber: z.string().max(128).optional().or(z.literal('')).transform((value) => value?.trim() || null),
  expiryDate: z.string().optional().or(z.literal('')).transform((value) => value && value.trim() ? new Date(value) : null),
  scannedGtin: z.string().max(64).optional().or(z.literal('')).transform((value) => value?.trim() || null),
  notes: z.string().max(256).optional().or(z.literal('')).transform((value) => value?.trim() || null),
});

const updateReceiptLineSchema = z.object({
  lineId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  batchNumber: z.string().max(128).optional().transform((value) => value?.trim() || null),
  expiryDate: z.string().optional().transform((value) => value ? new Date(value) : null),
  notes: z.string().max(256).optional().transform((value) => value?.trim() || null),
});

const searchItemByGtinSchema = z.object({
  gtin: z.string().min(1).max(64),
});

export async function createGoodsReceiptAction(_prevState: unknown, formData: FormData) {
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

  const parsed = createGoodsReceiptSchema.safeParse({
    locationId: formData.get('locationId'),
    orderId: formData.get('orderId'),
    supplierId: formData.get('supplierId'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { error: 'Invalid receipt details' } as const;
  }

  const { locationId, orderId, supplierId, notes } = parsed.data;

  // Verify location belongs to practice
  const location = await prisma.location.findUnique({
    where: { id: locationId, practiceId },
  });

  if (!location) {
    return { error: 'Location not found' } as const;
  }

  // Verify supplier belongs to practice if provided
  if (supplierId) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId, practiceId },
    });

    if (!supplier) {
      return { error: 'Supplier not found' } as const;
    }
  }

  // Verify order belongs to practice if provided
  if (orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId, practiceId },
    });

    if (!order) {
      return { error: 'Order not found' } as const;
    }
  }

  const receipt = await prisma.goodsReceipt.create({
    data: {
      practiceId,
      locationId,
      orderId,
      supplierId,
      notes,
      status: GoodsReceiptStatus.DRAFT,
      createdById: session.user.id,
    },
  });

  revalidatePath('/receiving');
  return { success: true, receiptId: receipt.id } as const;
}

export async function addReceiptLineAction(_prevState: unknown, formData: FormData) {
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

  const parsed = addReceiptLineSchema.safeParse({
    receiptId: formData.get('receiptId'),
    itemId: formData.get('itemId'),
    quantity: formData.get('quantity'),
    batchNumber: formData.get('batchNumber'),
    expiryDate: formData.get('expiryDate'),
    scannedGtin: formData.get('scannedGtin'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { error: 'Invalid line details' } as const;
  }

  const { receiptId, itemId, quantity, batchNumber, expiryDate, scannedGtin, notes } = parsed.data;

  // Verify receipt exists and is DRAFT
  const receipt = await prisma.goodsReceipt.findUnique({
    where: { id: receiptId, practiceId },
  });

  if (!receipt) {
    return { error: 'Receipt not found' } as const;
  }

  if (receipt.status !== GoodsReceiptStatus.DRAFT) {
    return { error: 'Cannot edit confirmed receipt' } as const;
  }

  // Verify item belongs to practice
  const item = await prisma.item.findUnique({
    where: { id: itemId, practiceId },
  });

  if (!item) {
    return { error: 'Item not found' } as const;
  }

  // Check if line already exists for this item
  const existingLine = await prisma.goodsReceiptLine.findFirst({
    where: {
      receiptId,
      itemId,
    },
  });

  if (existingLine) {
    // Update existing line
    const line = await prisma.goodsReceiptLine.update({
      where: { id: existingLine.id },
      data: {
        quantity: existingLine.quantity + quantity,
        batchNumber: batchNumber || existingLine.batchNumber,
        expiryDate: expiryDate || existingLine.expiryDate,
        notes: notes || existingLine.notes,
      },
    });

    revalidatePath(`/receiving/${receiptId}`);
    return { success: true, lineId: line.id } as const;
  }

  // Create new line
  const line = await prisma.goodsReceiptLine.create({
    data: {
      receiptId,
      itemId,
      quantity,
      batchNumber,
      expiryDate,
      scannedGtin,
      notes,
    },
  });

  revalidatePath(`/receiving/${receiptId}`);
  return { success: true, lineId: line.id } as const;
}

export async function updateReceiptLineAction(_prevState: unknown, formData: FormData) {
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

  const parsed = updateReceiptLineSchema.safeParse({
    lineId: formData.get('lineId'),
    quantity: formData.get('quantity'),
    batchNumber: formData.get('batchNumber'),
    expiryDate: formData.get('expiryDate'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { error: 'Invalid line details' } as const;
  }

  const { lineId, quantity, batchNumber, expiryDate, notes } = parsed.data;

  // Verify line exists and receipt is DRAFT
  const line = await prisma.goodsReceiptLine.findUnique({
    where: { id: lineId },
    include: {
      receipt: true,
    },
  });

  if (!line || line.receipt.practiceId !== practiceId) {
    return { error: 'Line not found' } as const;
  }

  if (line.receipt.status !== GoodsReceiptStatus.DRAFT) {
    return { error: 'Cannot edit confirmed receipt' } as const;
  }

  await prisma.goodsReceiptLine.update({
    where: { id: lineId },
    data: {
      quantity,
      batchNumber,
      expiryDate,
      notes,
    },
  });

  revalidatePath(`/receiving/${line.receiptId}`);
  return { success: true } as const;
}

export async function removeReceiptLineAction(lineId: string) {
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

  // Verify line exists and receipt is DRAFT
  const line = await prisma.goodsReceiptLine.findUnique({
    where: { id: lineId },
    include: {
      receipt: true,
    },
  });

  if (!line || line.receipt.practiceId !== practiceId) {
    throw new Error('Line not found');
  }

  if (line.receipt.status !== GoodsReceiptStatus.DRAFT) {
    throw new Error('Cannot edit confirmed receipt');
  }

  await prisma.goodsReceiptLine.delete({
    where: { id: lineId },
  });

  revalidatePath(`/receiving/${line.receiptId}`);
}

export async function confirmGoodsReceiptAction(receiptId: string) {
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

  // Fetch receipt with lines
  const receipt = await prisma.goodsReceipt.findUnique({
    where: { id: receiptId, practiceId },
    include: {
      lines: {
        include: {
          item: true,
        },
      },
    },
  });

  if (!receipt) {
    throw new Error('Receipt not found');
  }

  if (receipt.status !== GoodsReceiptStatus.DRAFT) {
    throw new Error('Receipt is not in draft status');
  }

  if (receipt.lines.length === 0) {
    throw new Error('Receipt must have at least one line');
  }

  // Validate all lines have positive quantities
  const invalidLines = receipt.lines.filter((line) => line.quantity <= 0);
  if (invalidLines.length > 0) {
    throw new Error('All lines must have positive quantities');
  }

  // Process receipt in a transaction
  await prisma.$transaction(async (tx) => {
    // Update inventory and create stock adjustments for each line
    for (const line of receipt.lines) {
      // Update LocationInventory
      const existingInventory = await tx.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: receipt.locationId,
            itemId: line.itemId,
          },
        },
      });

      const newQuantity = (existingInventory?.quantity ?? 0) + line.quantity;
      const reorderPoint = existingInventory?.reorderPoint ?? null;

      await tx.locationInventory.upsert({
        where: {
          locationId_itemId: {
            locationId: receipt.locationId,
            itemId: line.itemId,
          },
        },
        create: {
          locationId: receipt.locationId,
          itemId: line.itemId,
          quantity: newQuantity,
        },
        update: {
          quantity: newQuantity,
        },
      });

      // Create StockAdjustment
      await tx.stockAdjustment.create({
        data: {
          itemId: line.itemId,
          locationId: receipt.locationId,
          practiceId,
          quantity: line.quantity,
          reason: 'Goods Receipt',
          note: `Receipt #${receiptId.slice(0, 8)}${line.batchNumber ? ` - Batch: ${line.batchNumber}` : ''}`,
          createdById: session.user.id,
        },
      });

      // Check for low stock after receiving
      await checkAndCreateLowStockNotification(
        {
          practiceId,
          itemId: line.itemId,
          locationId: receipt.locationId,
          newQuantity,
          reorderPoint,
        },
        tx
      );
    }

    // Mark receipt as CONFIRMED
    await tx.goodsReceipt.update({
      where: { id: receiptId },
      data: {
        status: GoodsReceiptStatus.CONFIRMED,
        receivedAt: new Date(),
      },
    });

    // Create AuditLog entry
    await tx.auditLog.create({
      data: {
        practiceId,
        actorId: session.user.id,
        entityType: 'GoodsReceipt',
        entityId: receiptId,
        action: 'CONFIRMED',
        changes: {
          lineCount: receipt.lines.length,
          totalQuantity: receipt.lines.reduce((sum, line) => sum + line.quantity, 0),
          items: receipt.lines.map((line) => ({
            itemId: line.itemId,
            itemName: line.item.name,
            quantity: line.quantity,
            batchNumber: line.batchNumber,
            expiryDate: line.expiryDate,
          })),
        },
        metadata: {
          locationId: receipt.locationId,
          orderId: receipt.orderId,
          supplierId: receipt.supplierId,
        },
      },
    });
  });

  revalidatePath('/receiving');
  revalidatePath(`/receiving/${receiptId}`);
  revalidatePath('/inventory');
}

export async function cancelGoodsReceiptAction(receiptId: string) {
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

  // Verify receipt exists and is DRAFT
  const receipt = await prisma.goodsReceipt.findUnique({
    where: { id: receiptId, practiceId },
  });

  if (!receipt) {
    throw new Error('Receipt not found');
  }

  if (receipt.status !== GoodsReceiptStatus.DRAFT) {
    throw new Error('Can only cancel draft receipts');
  }

  await prisma.goodsReceipt.update({
    where: { id: receiptId },
    data: {
      status: GoodsReceiptStatus.CANCELLED,
    },
  });

  revalidatePath('/receiving');
  revalidatePath(`/receiving/${receiptId}`);
}

export async function searchItemByGtinAction(gtin: string) {
  const { practiceId } = await requireActivePractice();

  const parsed = searchItemByGtinSchema.safeParse({ gtin });

  if (!parsed.success) {
    return { item: null, product: null } as const;
  }

  // Find product by GTIN
  const product = await prisma.product.findUnique({
    where: { gtin: parsed.data.gtin },
  });

  if (!product) {
    return { item: null, product: null } as const;
  }

  // Find item in practice linked to this product
  const item = await prisma.item.findFirst({
    where: {
      practiceId,
      productId: product.id,
    },
    include: {
      product: true,
    },
  });

  return { item, product } as const;
}

export async function deleteGoodsReceiptAction(receiptId: string) {
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

  // Verify receipt exists and is not CONFIRMED
  const receipt = await prisma.goodsReceipt.findUnique({
    where: { id: receiptId, practiceId },
  });

  if (!receipt) {
    throw new Error('Receipt not found');
  }

  if (receipt.status === GoodsReceiptStatus.CONFIRMED) {
    throw new Error('Cannot delete confirmed receipt');
  }

  await prisma.goodsReceipt.delete({
    where: { id: receiptId },
  });

  revalidatePath('/receiving');
  redirect('/receiving');
}

