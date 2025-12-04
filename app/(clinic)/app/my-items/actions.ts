'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { buildRequestContext } from '@/src/lib/context/context-builder';
import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';
import { isDomainError } from '@/src/domain/errors';
import logger from '@/lib/logger';
import { getInventoryService, getItemService } from '@/src/services';

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
    logger.error({ error }, 'createOrdersFromCatalogAction failed');
    if (isDomainError(error)) {
      return { error: error.message } as const;
    }
    return { error: 'Failed to create orders. Please try again.' } as const;
  }
}

/**
 * Quick order a single catalog item.
 * Resolves supplier + order server-side and redirects to the order detail.
 */
export async function quickOrderFromItemAction(itemId: string) {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await buildRequestContext();
    const { getOrderService } = await import('@/src/services/orders');
    const orderService = getOrderService();

    const result = await orderService.quickOrderForItem(ctx, itemId);

    if (result.status === 'NO_DEFAULT_SUPPLIER') {
      redirect(`/orders/new?item=${itemId}`);
    }

    revalidatePath('/my-items');
    revalidatePath('/orders');
    revalidatePath('/dashboard');

    redirect(`/orders/${result.orderId}`);
  } catch (error) {
    logger.error({ error, itemId }, 'quickOrderFromItemAction failed');
    if (isDomainError(error)) {
      throw new Error(error.message);
    }
    throw error;
  }
}

const setDefaultSupplierSchema = z.object({
  itemId: z.string().min(1),
  practiceSupplierId: z.string().min(1),
});

export async function setDefaultSupplierAction(
  input: { itemId: string; practiceSupplierId: string }
): Promise<{ success?: string; error?: string }> {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await buildRequestContext();
    const parsed = setDefaultSupplierSchema.safeParse(input);

    if (!parsed.success) {
      return { error: 'Invalid supplier selection.' };
    }

    const itemService = getItemService();
    await itemService.updateItem(ctx, parsed.data.itemId, {
      defaultPracticeSupplierId: parsed.data.practiceSupplierId,
    });

    revalidatePath('/my-items');
    revalidatePath('/orders');

    return { success: 'Preferred supplier updated.' };
  } catch (error) {
    logger.error({ error }, 'setDefaultSupplierAction failed');
    if (isDomainError(error)) {
      return { error: error.message };
    }
    return { error: 'Failed to update preferred supplier.' };
  }
}

