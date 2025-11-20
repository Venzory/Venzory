'use server';

import { revalidatePath } from 'next/cache';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';
import { isDomainError } from '@/src/domain/errors';

/**
 * Create orders from catalog items (selected items)
 */
export async function createOrdersFromCatalogAction(selectedItemIds: string[]) {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();
    const { getOrderService } = await import('@/src/services/orders');
    const orderService = getOrderService();

    const result = await orderService.createOrdersFromCatalogItems(ctx, selectedItemIds);

    revalidatePath('/my-items');
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
    console.error('[createOrdersFromCatalogAction]', error);
    if (isDomainError(error)) {
      return { error: error.message } as const;
    }
    return { error: 'Failed to create orders. Please try again.' } as const;
  }
}

