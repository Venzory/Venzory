'use server';

import { revalidatePath } from 'next/cache';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';
import { isDomainError } from '@/src/domain/errors';
import logger from '@/lib/logger';

/**
 * Create orders from low stock items
 * Standalone action for the Reorder Suggestions module
 */
export async function createOrdersFromLowStockAction(selectedItemIds: string[]) {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();
    const { getOrderService } = await import('@/src/services/orders');
    const orderService = getOrderService();

    const result = await orderService.createOrdersFromLowStock(ctx, selectedItemIds);

    revalidatePath('/reorder-suggestions');
    revalidatePath('/inventory');
    revalidatePath('/orders');
    revalidatePath('/dashboard');

    const message =
      result.orders.length === 1
        ? `Created 1 draft order for ${result.orders[0].supplierName}`
        : `Created ${result.orders.length} draft orders for ${result.orders.length} suppliers`;

    return {
      success: true,
      message,
      orders: result.orders,
      skippedItems: result.skippedItems.length > 0 ? result.skippedItems : undefined,
    } as const;
  } catch (error) {
    logger.error({ error }, 'createOrdersFromLowStockAction failed');
    if (isDomainError(error)) {
      return { error: error.message } as const;
    }
    return { error: 'Failed to create orders. Please try again.' } as const;
  }
}

