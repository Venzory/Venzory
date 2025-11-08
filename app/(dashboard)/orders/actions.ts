'use server';

import { PracticeRole, OrderStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/rbac';
import { sendOrderEmail } from '@/lib/email';
import { createNotificationForPracticeUsers } from '@/lib/notifications';

const createDraftOrderSchema = z.object({
  supplierId: z.string().cuid(),
  notes: z.string().max(512).optional().transform((value) => value?.trim() || null),
  reference: z.string().max(128).optional().transform((value) => value?.trim() || null),
  items: z.array(
    z.object({
      itemId: z.string().cuid(),
      quantity: z.coerce.number().int().positive(),
      unitPrice: z.coerce.number().optional().transform((value) => value || null),
    })
  ).min(1, 'At least one item is required'),
});

const updateOrderItemSchema = z.object({
  orderId: z.string().cuid(),
  itemId: z.string().cuid(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().optional().transform((value) => value || null),
  notes: z.string().max(256).optional().transform((value) => value?.trim() || null),
});

const updateOrderSchema = z.object({
  orderId: z.string().cuid(),
  notes: z.string().max(512).optional().transform((value) => value?.trim() || null),
  reference: z.string().max(128).optional().transform((value) => value?.trim() || null),
});

const addOrderItemSchema = z.object({
  orderId: z.string().cuid(),
  itemId: z.string().cuid(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().optional().transform((value) => value || null),
});

export async function createDraftOrderAction(_prevState: unknown, formData: FormData) {
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

  // Parse items from formData (they come as JSON string)
  const itemsJson = formData.get('items');
  let items;
  try {
    items = itemsJson ? JSON.parse(itemsJson as string) : [];
  } catch {
    return { error: 'Invalid items data' } as const;
  }

  const parsed = createDraftOrderSchema.safeParse({
    supplierId: formData.get('supplierId'),
    notes: formData.get('notes'),
    reference: formData.get('reference'),
    items,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid order data' } as const;
  }

  const { supplierId, notes, reference, items: orderItems } = parsed.data;

  // Verify supplier belongs to practice
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId, practiceId },
  });

  if (!supplier) {
    return { error: 'Supplier not found' } as const;
  }

  // Create order with items
  const order = await prisma.order.create({
    data: {
      practiceId,
      supplierId,
      status: OrderStatus.DRAFT,
      createdById: session.user.id,
      notes,
      reference,
      items: {
        create: orderItems.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    },
  });

  revalidatePath('/orders');
  redirect(`/orders/${order.id}`);
}

export async function updateOrderItemAction(formData: FormData) {
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

  const parsed = updateOrderItemSchema.safeParse({
    orderId: formData.get('orderId'),
    itemId: formData.get('itemId'),
    quantity: formData.get('quantity'),
    unitPrice: formData.get('unitPrice'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    throw new Error('Invalid item data');
  }

  const { orderId, itemId, quantity, unitPrice, notes } = parsed.data;

  // Verify order is DRAFT and belongs to practice
  const order = await prisma.order.findUnique({
    where: { id: orderId, practiceId },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status !== OrderStatus.DRAFT) {
    throw new Error('Can only edit draft orders');
  }

  // Update or create order item
  await prisma.orderItem.upsert({
    where: {
      orderId_itemId: {
        orderId,
        itemId,
      },
    },
    update: {
      quantity,
      unitPrice,
      notes,
    },
    create: {
      orderId,
      itemId,
      quantity,
      unitPrice,
      notes,
    },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/orders');
}

export async function addOrderItemAction(_prevState: unknown, formData: FormData) {
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

  const parsed = addOrderItemSchema.safeParse({
    orderId: formData.get('orderId'),
    itemId: formData.get('itemId'),
    quantity: formData.get('quantity'),
    unitPrice: formData.get('unitPrice'),
  });

  if (!parsed.success) {
    return { error: 'Invalid item data' } as const;
  }

  const { orderId, itemId, quantity, unitPrice } = parsed.data;

  // Verify order is DRAFT and belongs to practice
  const order = await prisma.order.findUnique({
    where: { id: orderId, practiceId },
  });

  if (!order) {
    return { error: 'Order not found' } as const;
  }

  if (order.status !== OrderStatus.DRAFT) {
    return { error: 'Can only edit draft orders' } as const;
  }

  // Check if item already exists in order
  const existing = await prisma.orderItem.findUnique({
    where: {
      orderId_itemId: {
        orderId,
        itemId,
      },
    },
  });

  if (existing) {
    return { error: 'Item already in order' } as const;
  }

  await prisma.orderItem.create({
    data: {
      orderId,
      itemId,
      quantity,
      unitPrice,
    },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/orders');
  return { success: 'Item added to order' } as const;
}

// Wrapper for inline form usage (no return value expected)
export async function addOrderItemInlineAction(formData: FormData) {
  await addOrderItemAction(null, formData);
}

export async function removeOrderItemAction(orderId: string, itemId: string) {
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

  // Verify order is DRAFT and belongs to practice
  const order = await prisma.order.findUnique({
    where: { id: orderId, practiceId },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status !== OrderStatus.DRAFT) {
    throw new Error('Can only edit draft orders');
  }

  await prisma.orderItem.delete({
    where: {
      orderId_itemId: {
        orderId,
        itemId,
      },
    },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/orders');
}

export async function updateOrderAction(formData: FormData) {
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

  const parsed = updateOrderSchema.safeParse({
    orderId: formData.get('orderId'),
    notes: formData.get('notes'),
    reference: formData.get('reference'),
  });

  if (!parsed.success) {
    throw new Error('Invalid order data');
  }

  const { orderId, notes, reference } = parsed.data;

  // Verify order is DRAFT and belongs to practice
  const order = await prisma.order.findUnique({
    where: { id: orderId, practiceId },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status !== OrderStatus.DRAFT) {
    throw new Error('Can only edit draft orders');
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      notes,
      reference,
    },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/orders');
}

export async function deleteOrderAction(orderId: string) {
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

  // Verify order is DRAFT and belongs to practice
  const order = await prisma.order.findUnique({
    where: { id: orderId, practiceId },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status !== OrderStatus.DRAFT) {
    throw new Error('Can only delete draft orders');
  }

  await prisma.order.delete({
    where: { id: orderId },
  });

  revalidatePath('/orders');
  redirect('/orders');
}

export async function sendOrderAction(orderId: string) {
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

  // Fetch order with all details
  const order = await prisma.order.findUnique({
    where: { id: orderId, practiceId },
    include: {
      supplier: true,
      practice: true,
      items: {
        include: {
          item: {
            select: {
              name: true,
              sku: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Validate order status
  if (order.status !== OrderStatus.DRAFT) {
    throw new Error('Can only send draft orders');
  }

  // Validate order has supplier
  if (!order.supplier) {
    throw new Error('Order must have a supplier');
  }

  // Validate order has at least one item
  if (order.items.length === 0) {
    throw new Error('Order must have at least one item');
  }

  // Validate all items have quantity > 0
  const invalidItems = order.items.filter((item) => item.quantity <= 0);
  if (invalidItems.length > 0) {
    throw new Error('All items must have quantity greater than 0');
  }

  // Calculate order total and prepare items for email
  const orderItems = order.items.map((orderItem) => {
    const unitPrice = orderItem.unitPrice ? parseFloat(orderItem.unitPrice.toString()) : 0;
    return {
      name: orderItem.item.name,
      sku: orderItem.item.sku,
      quantity: orderItem.quantity,
      unitPrice,
      total: unitPrice * orderItem.quantity,
    };
  });

  const orderTotal = orderItems.reduce((sum, item) => sum + item.total, 0);

  // Build practice address
  const practiceAddress = [
    order.practice.street,
    order.practice.postalCode && order.practice.city
      ? `${order.practice.postalCode} ${order.practice.city}`
      : order.practice.postalCode || order.practice.city,
    order.practice.country,
  ]
    .filter(Boolean)
    .join('\n');

  // Update order status to SENT
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.SENT,
      sentAt: new Date(),
    },
  });

  // Create notification for ADMIN + STAFF users
  await createNotificationForPracticeUsers({
    practiceId,
    type: 'ORDER_SENT',
    title: 'Order sent to supplier',
    message: `Order ${order.reference ? `"${order.reference}"` : `#${orderId.slice(0, 8)}`} to ${order.supplier.name} was sent.`,
    orderId,
  });

  // Send email to supplier (or log if not configured)
  if (order.supplier.email) {
    await sendOrderEmail({
      supplierEmail: order.supplier.email,
      supplierName: order.supplier.name,
      practiceName: order.practice.name,
      practiceAddress: practiceAddress || null,
      orderReference: order.reference,
      orderNotes: order.notes,
      orderItems,
      orderTotal,
    });
  } else {
    console.warn(`[sendOrderAction] Supplier ${order.supplier.name} has no email address`);
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/orders');
}

