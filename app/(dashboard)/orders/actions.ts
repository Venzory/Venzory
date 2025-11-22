'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getOrderService } from '@/src/services/orders';
import { isDomainError } from '@/src/domain/errors';
import logger from '@/lib/logger';
import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';
import { z } from 'zod';
import { FormState } from '@/lib/form-types';

const orderService = getOrderService();

/**
 * Create a new draft order
 */
export async function createDraftOrderAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  await verifyCsrfFromHeaders();
  
  let orderId: string | undefined;

  try {
    const ctx = await buildRequestContext();
    
    const practiceSupplierId = formData.get('practiceSupplierId') as string;
    const itemsJson = formData.get('items') as string;
    
    if (!practiceSupplierId) {
      return { error: 'Supplier is required' };
    }

    let items = [];
    try {
      items = JSON.parse(itemsJson);
    } catch (e) {
      return { error: 'Invalid items data' };
    }

    if (!Array.isArray(items) || items.length === 0) {
      return { error: 'At least one item is required' };
    }

    const order = await orderService.createOrder(ctx, {
      practiceSupplierId,
      items: items.map((item: any) => ({
        itemId: item.itemId,
        quantity: Number(item.quantity),
        unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
      })),
    });

    orderId = order.id;
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to create order');
    const message = error instanceof Error ? error.message : 'Failed to create order';
    return { error: message };
  }

  if (orderId) {
    revalidatePath('/orders');
    redirect(`/orders/${orderId}`);
  }

  return { error: 'Unexpected error: No order ID created' };
}

/**
 * Update an existing order details
 */
export async function updateOrderAction(formData: FormData) {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await buildRequestContext();
    
    const orderId = formData.get('orderId') as string;
    if (!orderId) return { success: false, error: 'Missing order ID' };

    const notes = formData.get('notes') as string;
    const reference = formData.get('reference') as string;
    const expectedAtStr = formData.get('expectedAt') as string;

    await orderService.updateOrder(ctx, orderId, {
      notes: notes || undefined,
      reference: reference || undefined,
      expectedAt: expectedAtStr ? new Date(expectedAtStr) : undefined,
    });

    revalidatePath(`/orders/${orderId}`);
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to update order');
    const message = error instanceof Error ? error.message : 'Failed to update order';
    return { success: false, error: message };
  }
}

/**
 * Add an item to an order
 */
export async function addOrderItemAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await buildRequestContext();
    
    const orderId = formData.get('orderId') as string;
    const itemId = formData.get('itemId') as string;
    const quantity = Number(formData.get('quantity'));
    const unitPriceStr = formData.get('unitPrice');
    const unitPrice = unitPriceStr ? Number(unitPriceStr) : undefined;

    if (!orderId || !itemId || !quantity) {
      return { error: 'Missing required fields' };
    }

    await orderService.addOrderItem(ctx, orderId, {
      itemId,
      quantity,
      unitPrice,
    });

    revalidatePath(`/orders/${orderId}`);
    return { success: 'Item added to order' };
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to add order item');
    const message = error instanceof Error ? error.message : 'Failed to add order item';
    return { error: message };
  }
}

/**
 * Update an item in an order
 */
export async function updateOrderItemAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await buildRequestContext();
    
    const orderId = formData.get('orderId') as string;
    const itemId = formData.get('itemId') as string;
    const quantity = Number(formData.get('quantity'));
    const unitPriceStr = formData.get('unitPrice');
    const unitPrice = unitPriceStr ? Number(unitPriceStr) : undefined;
    const notes = formData.get('notes') as string;

    if (!orderId || !itemId || !quantity) {
      return { error: 'Missing required fields' };
    }

    await orderService.updateOrderItem(ctx, orderId, itemId, {
      quantity,
      unitPrice,
      notes: notes || undefined,
    });

    revalidatePath(`/orders/${orderId}`);
    return { success: 'Item updated' };
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to update order item');
    const message = error instanceof Error ? error.message : 'Failed to update order item';
    return { error: message };
  }
}


/**
 * Remove an item from an order
 */
export async function removeOrderItemAction(orderId: string, itemId: string) {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await buildRequestContext();
    
    await orderService.removeOrderItem(ctx, orderId, itemId);

    revalidatePath(`/orders/${orderId}`);
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to remove order item');
    const message = error instanceof Error ? error.message : 'Failed to remove order item';
    return { success: false, error: message };
  }
}

/**
 * Send an order (finalize it)
 */
export async function sendOrderAction(orderId: string) {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await buildRequestContext();
    
    await orderService.sendOrder(ctx, orderId);

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to send order');
    const message = error instanceof Error ? error.message : 'Failed to send order';
    return { success: false, error: message };
  }
}

/**
 * Delete an order
 */
export async function deleteOrderAction(orderId: string) {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await buildRequestContext();
    
    await orderService.deleteOrder(ctx, orderId);

    revalidatePath('/orders');
    redirect('/orders');
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to delete order');
    // Redirect throws an error that Next.js catches, so we need to rethrow if it's a redirect
    if ((error as any).digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Failed to delete order';
    return { success: false, error: message };
  }
}

/**
 * Close an order manually
 */
export async function closeOrderAction(orderId: string): Promise<{ success: boolean; error?: string }> {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    const result = await orderService.closeOrder(ctx, orderId);

    if (isDomainError(result)) {
      logger.error({ error: result }, 'Service error');
      return { success: false, error: result.message };
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to close order');
    const message = error instanceof Error ? error.message : 'Failed to close order';
    return { success: false, error: message };
  }
}
