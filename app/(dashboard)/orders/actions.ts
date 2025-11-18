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
import { sendOrderEmail } from '@/src/lib/email/sendOrderEmail';
import { calculateOrderTotal, decimalToNumber } from '@/lib/prisma-transforms';
import { createNotificationForPracticeUsers } from '@/lib/notifications';
import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';
import logger from '@/lib/logger';
import type { FormState } from '@/lib/form-types';

const orderService = getOrderService();

// Validation schemas
const createDraftOrderSchema = z.object({
  practiceSupplierId: z.string().min(1, 'Supplier is required'),
  notes: z.string().max(512).transform((value) => value.trim() || null).optional(),
  reference: z.string().max(128).transform((value) => value.trim() || null).optional(),
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
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.coerce.number().int('Quantity must be a whole number').positive('Quantity must be at least 1'),
  unitPrice: z.union([z.coerce.number().nonnegative(), z.null()]).optional().transform((value) => value ?? null),
});

/**
 * Create a draft order with items
 */
export async function createDraftOrderAction(_prevState: unknown, formData: FormData): Promise<FormState> {
  await verifyCsrfFromHeaders();
  
  let orderId: string | null = null;
  
  try {
    const ctx = await buildRequestContext();

    // Parse items from indexed FormData fields
    const items: Array<{ itemId: string; quantity: string; unitPrice: string }> = [];
    let index = 0;
    while (formData.has(`items[${index}].itemId`)) {
      items.push({
        itemId: formData.get(`items[${index}].itemId`) as string,
        quantity: formData.get(`items[${index}].quantity`) as string,
        unitPrice: formData.get(`items[${index}].unitPrice`) as string,
      });
      index++;
    }

    const parsed = createDraftOrderSchema.safeParse({
      practiceSupplierId: formData.get('practiceSupplierId') || '',
      notes: formData.get('notes') || '',
      reference: formData.get('reference') || '',
      items,
    });

    if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
    }

    const { practiceSupplierId, notes, reference, items: orderItems } = parsed.data;

    // Create order using service
    const result = await orderService.createOrder(ctx, {
      practiceSupplierId,
      notes,
      reference,
      items: orderItems.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });

    if (isDomainError(result)) {
      return { error: result.message };
    }

    orderId = result.id;
    revalidatePath('/orders');
    revalidatePath('/dashboard');
  } catch (error: unknown) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'createDraftOrderAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      practiceSupplierId: formData.get('practiceSupplierId'),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to create order');
    
    const message = error instanceof Error ? error.message : 'Failed to create order';
    return { error: message };
  }
  
  // Redirect outside try-catch so it can throw properly
  if (orderId) {
    redirect(`/orders/${orderId}`);
  } else {
    return { error: 'Failed to create order - no order ID returned' };
  }
}

/**
 * Update an order item (quantity, price, notes)
 */
export async function updateOrderItemAction(formData: FormData) {
  await verifyCsrfFromHeaders();
  
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
    revalidatePath('/dashboard');
  } catch (error: unknown) {
    console.error('Failed to update order item:', error);
    throw error;
  }
}

/**
 * Add an order item (with form validation)
 */
export async function addOrderItemAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    const parsed = addOrderItemSchema.safeParse({
      orderId: formData.get('orderId'),
      itemId: formData.get('itemId'),
      quantity: formData.get('quantity'),
      unitPrice: formData.get('unitPrice'),
    });

    if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
    }

    const { orderId, itemId, quantity, unitPrice } = parsed.data;

    // Add order item using service
    const result = await orderService.addOrderItem(ctx, orderId, {
      itemId,
      quantity,
      unitPrice,
    });

    if (isDomainError(result)) {
      return { error: result.message };
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
    revalidatePath('/dashboard');
    return { success: 'Item added to order' };
  } catch (error: unknown) {
    console.error('Failed to add order item:', error);
    const message = error instanceof Error ? error.message : 'Failed to add item';
    return { error: message };
  }
}

/**
 * Add an order item inline (returns result for client-side handling)
 */
export async function addOrderItemInlineAction(formData: FormData): Promise<FormState> {
  await verifyCsrfFromHeaders();
  const result = await addOrderItemAction({}, formData);
  return result;
}

/**
 * Remove an item from an order
 */
export async function removeOrderItemAction(orderId: string, itemId: string) {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    const result = await orderService.removeOrderItem(ctx, orderId, itemId);

    if (isDomainError(result)) {
      console.error('Service error:', result.message);
      throw new Error(result.message);
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
    revalidatePath('/dashboard');
  } catch (error: unknown) {
    console.error('Failed to remove order item:', error);
    throw error;
  }
}

/**
 * Update order metadata (notes, reference)
 */
export async function updateOrderAction(formData: FormData) {
  await verifyCsrfFromHeaders();
  
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
  } catch (error: unknown) {
    console.error('Failed to update order:', error);
    throw error;
  }
}

/**
 * Delete a draft order
 * Returns success status instead of redirecting to allow client-side navigation
 */
export async function deleteOrderAction(orderId: string): Promise<{ success: boolean; error?: string }> {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    const result = await orderService.deleteOrder(ctx, orderId);

    if (isDomainError(result)) {
      console.error('Service error:', result.message);
      return { success: false, error: result.message };
    }

    revalidatePath('/orders');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to delete order:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete order';
    return { success: false, error: message };
  }
}

/**
 * Send/submit an order to supplier
 * Returns success status instead of throwing to allow client-side error handling
 */
export async function sendOrderAction(orderId: string): Promise<{ success: boolean; error?: string }> {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    // Send the order using service
    const result = await orderService.sendOrder(ctx, orderId);

    if (isDomainError(result)) {
      console.error('Service error:', result.message);
      return { success: false, error: result.message };
    }

    // Send email notification to supplier
    try {
      const supplierEmail = result.practiceSupplier?.globalSupplier?.email;
      
      if (supplierEmail) {
        const supplierName = 
          result.practiceSupplier?.customLabel || 
          result.practiceSupplier?.globalSupplier?.name || 
          'Unknown supplier';

        // Extract practice information
        const practice = (result as any).practice;
        const practiceName = practice?.name || 'Unknown Practice';
        
        // Build practice address
        let practiceAddress: string | null = null;
        if (practice) {
          const addressParts: string[] = [];
          if (practice.street) addressParts.push(practice.street);
          if (practice.city) addressParts.push(practice.city);
          if (practice.postalCode) addressParts.push(practice.postalCode);
          if (practice.country) addressParts.push(practice.country);
          
          if (addressParts.length > 0) {
            practiceAddress = addressParts.join('\n');
          }
        }

        // Map items
        const items = (result.items ?? []).map((orderItem) => {
          const unitPrice = typeof orderItem.unitPrice === 'number' 
            ? orderItem.unitPrice 
            : (decimalToNumber(orderItem.unitPrice) || 0);

          return {
            name: orderItem.item?.name || 'Unknown Item',
            sku: orderItem.item?.sku || null,
            quantity: orderItem.quantity,
            unitPrice,
            total: unitPrice * orderItem.quantity,
          };
        });

        await sendOrderEmail({
          supplierEmail,
          supplierName,
          practiceName,
          practiceAddress,
          orderReference: result.reference,
          orderNotes: result.notes,
          items,
          orderTotal: calculateOrderTotal(result.items || []),
        });
      } else {
        logger.warn({
          action: 'sendOrderAction',
          orderId,
          supplierId: result.practiceSupplierId,
        }, 'Cannot send order email - supplier has no email address');
      }
    } catch (emailError) {
      logger.error({
        action: 'sendOrderAction',
        orderId,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      }, 'Failed to send order email');
      // Continue even if email fails
    }

    // Create notification for practice users
    try {
      await createNotificationForPracticeUsers({
        practiceId: ctx.practiceId,
        userId: ctx.userId,
        type: 'ORDER_SENT',
        title: 'Order Sent',
        message: `Order #${orderId.slice(0, 8)} has been sent to ${(result as any).practiceSupplier?.customLabel || (result as any).practiceSupplier?.globalSupplier?.name || 'supplier'}`,
        orderId: orderId,
      });
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Continue even if notification fails
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to send order:', error);
    const message = error instanceof Error ? error.message : 'Failed to send order';
    return { success: false, error: message };
  }
}


