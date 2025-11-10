/**
 * Orders Actions (Refactored)
 * Thin wrappers around OrderService
 */

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getOrderService } from '@/src/services/orders';
import { isDomainError } from '@/src/domain/errors';
import { OrderStatus } from '@prisma/client';
import { sendOrderEmail } from '@/lib/email';
import { createNotificationForPracticeUsers } from '@/lib/notifications';

const orderService = getOrderService();

// Validation schemas
const createDraftOrderSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  notes: z.string().max(512).optional().transform((value) => value?.trim() || null),
  reference: z.string().max(128).optional().transform((value) => value?.trim() || null),
  items: z.array(
    z.object({
      itemId: z.string().min(1, 'Item ID is required'),
      quantity: z.coerce.number().int().positive(),
      unitPrice: z.union([z.coerce.number().nonnegative(), z.null()]).optional().transform((value) => value ?? null),
    })
  ).min(1, 'At least one item is required'),
});

const updateOrderItemSchema = z.object({
  orderId: z.string().min(1),
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.union([z.coerce.number().nonnegative(), z.null()]).optional().transform((value) => value ?? null),
  notes: z.string().max(256).optional().transform((value) => value?.trim() || null),
});

const updateOrderSchema = z.object({
  orderId: z.string().min(1),
  notes: z.string().max(512).optional().transform((value) => value?.trim() || null),
  reference: z.string().max(128).optional().transform((value) => value?.trim() || null),
});

const addOrderItemSchema = z.object({
  orderId: z.string().min(1),
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.union([z.coerce.number().nonnegative(), z.null()]).optional().transform((value) => value ?? null),
});

/**
 * Create a draft order with items
 */
export async function createDraftOrderAction(_prevState: unknown, formData: FormData) {
  let orderId: string | null = null;
  
  try {
    const ctx = await buildRequestContext();

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

    // Create order using service
    const result = await orderService.createOrder(ctx, {
      supplierId,
      notes,
      reference,
      items: orderItems.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });

    if (isDomainError(result)) {
      return { error: result.message } as const;
    }

    orderId = result.id;
    revalidatePath('/orders');
  } catch (error: any) {
    console.error('Failed to create order:', error);
    return { error: error.message || 'Failed to create order' } as const;
  }
  
  // Redirect outside try-catch so it can throw properly
  if (orderId) {
    redirect(`/orders/${orderId}`);
  }
}

/**
 * Update an order item (quantity, price, notes)
 */
export async function updateOrderItemAction(formData: FormData) {
  try {
    const ctx = await buildRequestContext();

    const parsed = updateOrderItemSchema.safeParse({
      orderId: formData.get('orderId'),
      itemId: formData.get('itemId'),
      quantity: formData.get('quantity'),
      unitPrice: formData.get('unitPrice'),
      notes: formData.get('notes'),
    });

    if (!parsed.success) {
      console.error('Validation error:', parsed.error.issues[0]?.message);
      throw new Error(parsed.error.issues[0]?.message || 'Invalid data');
    }

    const { orderId, itemId, quantity, unitPrice, notes } = parsed.data;

    // Update order item using service
    const result = await orderService.updateOrderItem(ctx, orderId, itemId, {
      quantity,
      unitPrice,
      notes,
    });

    if (isDomainError(result)) {
      console.error('Service error:', result.message);
      throw new Error(result.message);
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
  } catch (error: any) {
    console.error('Failed to update order item:', error);
    throw error;
  }
}

/**
 * Add an order item (with form validation)
 */
export async function addOrderItemAction(_prevState: unknown, formData: FormData) {
  try {
    const ctx = await buildRequestContext();

    const parsed = addOrderItemSchema.safeParse({
      orderId: formData.get('orderId'),
      itemId: formData.get('itemId'),
      quantity: formData.get('quantity'),
      unitPrice: formData.get('unitPrice'),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid data' } as const;
    }

    const { orderId, itemId, quantity, unitPrice } = parsed.data;

    // Add order item using service
    const result = await orderService.addOrderItem(ctx, orderId, {
      itemId,
      quantity,
      unitPrice,
    });

    if (isDomainError(result)) {
      return { error: result.message } as const;
    }

    revalidatePath(`/orders/${orderId}`);
    return { success: true } as const;
  } catch (error: any) {
    console.error('Failed to add order item:', error);
    return { error: error.message || 'Failed to add item' } as const;
  }
}

/**
 * Add an order item inline (returns result for client-side handling)
 */
export async function addOrderItemInlineAction(formData: FormData) {
  const result = await addOrderItemAction(undefined, formData);
  return result;
}

/**
 * Remove an item from an order
 */
export async function removeOrderItemAction(orderId: string, itemId: string) {
  try {
    const ctx = await buildRequestContext();

    const result = await orderService.removeOrderItem(ctx, orderId, itemId);

    if (isDomainError(result)) {
      console.error('Service error:', result.message);
      throw new Error(result.message);
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
  } catch (error: any) {
    console.error('Failed to remove order item:', error);
    throw error;
  }
}

/**
 * Update order metadata (notes, reference)
 */
export async function updateOrderAction(formData: FormData) {
  try {
    const ctx = await buildRequestContext();

    const parsed = updateOrderSchema.safeParse({
      orderId: formData.get('orderId'),
      notes: formData.get('notes'),
      reference: formData.get('reference'),
    });

    if (!parsed.success) {
      console.error('Validation error:', parsed.error.issues[0]?.message);
      throw new Error(parsed.error.issues[0]?.message || 'Invalid data');
    }

    const { orderId, notes, reference } = parsed.data;

    // Update order using service
    const result = await orderService.updateOrder(ctx, orderId, {
      notes,
      reference,
    });

    if (isDomainError(result)) {
      console.error('Service error:', result.message);
      throw new Error(result.message);
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
  } catch (error: any) {
    console.error('Failed to update order:', error);
    throw error;
  }
}

/**
 * Delete a draft order
 */
export async function deleteOrderAction(orderId: string) {
  try {
    const ctx = await buildRequestContext();

    const result = await orderService.deleteOrder(ctx, orderId);

    if (isDomainError(result)) {
      console.error('Service error:', result.message);
      throw new Error(result.message);
    }

    revalidatePath('/orders');
  } catch (error: any) {
    console.error('Failed to delete order:', error);
    throw error;
  }
  
  // Redirect outside try-catch so it can throw properly
  redirect('/orders');
}

/**
 * Send/submit an order to supplier
 */
export async function sendOrderAction(orderId: string) {
  try {
    const ctx = await buildRequestContext();

    // Send the order using service
    const result = await orderService.sendOrder(ctx, orderId);

    if (isDomainError(result)) {
      console.error('Service error:', result.message);
      throw new Error(result.message);
    }

    // Send email notification
    try {
      // TODO: Transform OrderWithRelations to SendOrderEmailParams
      // await sendOrderEmail(result);
    } catch (emailError) {
      console.error('Failed to send order email:', emailError);
      // Continue even if email fails
    }

    // Create notification for practice users
    try {
      await createNotificationForPracticeUsers({
        practiceId: ctx.practiceId,
        userId: ctx.userId,
        type: 'ORDER_SENT',
        title: 'Order Sent',
        message: `Order #${orderId.slice(0, 8)} has been sent to ${(result as any).supplier?.name || 'supplier'}`,
        orderId: orderId,
      });
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Continue even if notification fails
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
  } catch (error: any) {
    console.error('Failed to send order:', error);
    throw error;
  }
}


