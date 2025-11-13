/**
 * Inventory Actions (Refactored)
 * Thin wrappers around InventoryService
 */

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getInventoryService } from '@/src/services/inventory';
import { getOrCreateProductForItem } from '@/lib/integrations';
import { isDomainError } from '@/src/domain/errors';
import { UserRepository } from '@/src/repositories/users';

const inventoryService = getInventoryService();
// Note: Location and Supplier CRUD operations use UserRepository directly
// These are simple CRUD operations without complex business logic
// TODO: Consider moving to InventoryService or SettingsService in future refactoring
const userRepository = new UserRepository();

// Validation schemas
const upsertItemSchema = z.object({
  itemId: z.string().cuid().optional(),
  name: z.string().min(1, 'Name is required'),
  sku: z.string().max(64).optional().transform((value) => value?.trim() || null),
  description: z
    .string()
    .max(512)
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : null)),
  unit: z.string().max(64).optional().transform((value) => value?.trim() || null),
  defaultSupplierId: z
    .string()
    .optional()
    .transform((value) => (value && value !== 'none' ? value : null)),
  gtin: z
    .string()
    .max(14)
    .optional()
    .transform((value) => value?.trim() || null),
  brand: z
    .string()
    .max(128)
    .optional()
    .transform((value) => value?.trim() || null),
});

const updateLocationSchema = z.object({
  locationId: z.string().cuid(),
  name: z.string().min(1, 'Name is required'),
  code: z.string().max(32).optional().transform((value) => value?.trim() || null),
  description: z
    .string()
    .max(256)
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : null)),
  parentId: z
    .string()
    .optional()
    .transform((value) => (value && value !== 'none' ? value : null)),
});

const createLocationSchema = updateLocationSchema.omit({ locationId: true });

const upsertSupplierSchema = z.object({
  supplierId: z.string().cuid().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z
    .string()
    .optional()
    .transform((value) => value?.trim() || null)
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'Invalid email address',
    }),
  phone: z.string().max(32).optional().transform((value) => value?.trim() || null),
  website: z
    .string()
    .optional()
    .transform((value) => value?.trim() || null)
    .refine((value) => !value || z.string().url().safeParse(value).success, {
      message: 'Invalid website URL',
    }),
  notes: z
    .string()
    .max(512)
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : null)),
});

const stockAdjustmentSchema = z.object({
  itemId: z.string().min(1, 'Please select an item'),
  locationId: z.string().min(1, 'Please select a location'),
  quantity: z.coerce.number().int('Quantity must be a whole number').refine((val) => val !== 0, {
    message: 'Quantity change cannot be zero',
  }),
  reason: z.string().max(64).optional().transform((value) => value?.trim() || null),
  note: z.string().max(256).optional().transform((value) => (value?.trim() ? value.trim() : null)),
});

/**
 * Create or update item
 */
export async function upsertItemAction(_prevState: unknown, formData: FormData) {
  try {
    const ctx = await buildRequestContext();

    const parsed = upsertItemSchema.safeParse({
      itemId: formData.get('itemId') ?? undefined,
      name: formData.get('name'),
      sku: formData.get('sku'),
      description: formData.get('description'),
      unit: formData.get('unit'),
      defaultSupplierId: formData.get('defaultSupplierId'),
      gtin: formData.get('gtin'),
      brand: formData.get('brand'),
    });

    if (!parsed.success) {
      return { error: 'Invalid item fields' } as const;
    }

    const { itemId, gtin, brand, name, description, sku, unit, defaultSupplierId } = parsed.data;

    if (itemId) {
      // Update existing item
      await inventoryService.updateItem(ctx, itemId, {
        name,
        description,
        sku,
        unit,
        defaultSupplierId,
      });
    } else {
      // Create new item - get or create product first
      const productId = await getOrCreateProductForItem(
        name,
        gtin ?? undefined,
        brand ?? undefined,
        description ?? undefined
      );

      await inventoryService.createItem(ctx, {
        productId,
        name,
        description,
        sku,
        unit,
        defaultSupplierId,
      });
    }

    revalidatePath('/inventory');
    return { success: itemId ? 'Item updated' : 'Item created' } as const;
  } catch (error) {
    console.error('[upsertItemAction]', error);
    if (isDomainError(error)) {
      return { error: error.message } as const;
    }
    return { error: 'An unexpected error occurred' } as const;
  }
}

/**
 * Delete item
 */
export async function deleteItemAction(itemId: string) {
  try {
    const ctx = await buildRequestContext();
    await inventoryService.deleteItem(ctx, itemId);
    revalidatePath('/inventory');
  } catch (error) {
    console.error('[deleteItemAction]', error);
    if (isDomainError(error)) {
      throw new Error(error.message);
    }
    throw error;
  }
}

/**
 * Create or update location
 */
export async function upsertLocationAction(_prevState: unknown, formData: FormData) {
  try {
    const ctx = await buildRequestContext();

    const payload = {
      locationId: formData.get('locationId') ?? undefined,
      name: formData.get('name'),
      code: formData.get('code'),
      description: formData.get('description'),
      parentId: formData.get('parentId'),
    };

    if (payload.locationId) {
      const parsed = updateLocationSchema.safeParse(payload);
      if (!parsed.success) {
        return { error: 'Invalid location details' } as const;
      }

      const { locationId, ...values } = parsed.data;
      await userRepository.updateLocation(locationId, ctx.practiceId, values);
    } else {
      const parsed = createLocationSchema.safeParse(payload);
      if (!parsed.success) {
        return { error: 'Invalid location details' } as const;
      }

      await userRepository.createLocation(ctx.practiceId, parsed.data);
    }

    revalidatePath('/locations');
    return { success: payload.locationId ? 'Location updated' : 'Location created' } as const;
  } catch (error) {
    console.error('[upsertLocationAction]', error);
    if (isDomainError(error)) {
      return { error: error.message } as const;
    }
    return { error: 'An unexpected error occurred' } as const;
  }
}

/**
 * Delete location
 */
export async function deleteLocationAction(locationId: string) {
  try {
    const ctx = await buildRequestContext();
    await userRepository.deleteLocation(locationId, ctx.practiceId);
    revalidatePath('/locations');
  } catch (error) {
    console.error('[deleteLocationAction]', error);
    if (isDomainError(error)) {
      throw new Error(error.message);
    }
    throw error;
  }
}

/**
 * Create or update supplier
 */
export async function upsertSupplierAction(_prevState: unknown, formData: FormData) {
  try {
    const ctx = await buildRequestContext();

    const parsed = upsertSupplierSchema.safeParse({
      supplierId: formData.get('supplierId') ?? undefined,
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      website: formData.get('website'),
      notes: formData.get('notes'),
    });

    if (!parsed.success) {
      return { error: 'Invalid supplier details' } as const;
    }

    const { supplierId, ...values } = parsed.data;

    if (supplierId) {
      await userRepository.updateSupplier(supplierId, ctx.practiceId, values);
    } else {
      await userRepository.createSupplier(ctx.practiceId, values);
    }

    revalidatePath('/suppliers');
    revalidatePath('/inventory');
    return { success: supplierId ? 'Supplier updated' : 'Supplier added' } as const;
  } catch (error) {
    console.error('[upsertSupplierAction]', error);
    if (isDomainError(error)) {
      return { error: error.message } as const;
    }
    return { error: 'An unexpected error occurred' } as const;
  }
}

/**
 * Delete supplier
 */
export async function deleteSupplierAction(supplierId: string) {
  try {
    const ctx = await buildRequestContext();
    await userRepository.deleteSupplier(supplierId, ctx.practiceId);
    revalidatePath('/suppliers');
    revalidatePath('/inventory');
  } catch (error) {
    console.error('[deleteSupplierAction]', error);
    if (isDomainError(error)) {
      throw new Error(error.message);
    }
    throw error;
  }
}

/**
 * Create stock adjustment
 */
export async function createStockAdjustmentAction(_prevState: unknown, formData: FormData) {
  try {
    const ctx = await buildRequestContext();

    const parsed = stockAdjustmentSchema.safeParse({
      itemId: formData.get('itemId'),
      locationId: formData.get('locationId'),
      quantity: formData.get('quantity'),
      reason: formData.get('reason'),
      note: formData.get('note'),
    });

    if (!parsed.success) {
      const firstError = parsed.error?.issues?.[0];
      return { error: firstError?.message || 'Invalid adjustment details' } as const;
    }

    await inventoryService.adjustStock(ctx, parsed.data);

    revalidatePath('/inventory');
    return { success: 'Stock adjustment recorded' } as const;
  } catch (error) {
    console.error('[createStockAdjustmentAction] Full error:', error);
    console.error('[createStockAdjustmentAction] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    if (isDomainError(error)) {
      return { error: error.message } as const;
    }
    if (error instanceof Error) {
      return { error: error.message } as const;
    }
    return { error: 'An unexpected error occurred' } as const;
  }
}

/**
 * Create orders from low stock items
 */
export async function createOrdersFromLowStockAction(selectedItemIds: string[]) {
  try {
    const ctx = await buildRequestContext();
    const { getOrderService } = await import('@/src/services/orders');
    const orderService = getOrderService();

    const result = await orderService.createOrdersFromLowStock(ctx, selectedItemIds);

    revalidatePath('/inventory');
    revalidatePath('/orders');

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
    console.error('[createOrdersFromLowStockAction]', error);
    if (isDomainError(error)) {
      return { error: error.message } as const;
    }
    return { error: 'Failed to create orders. Please try again.' } as const;
  }
}

// Inline wrappers (no return value)
export async function upsertItemInlineAction(formData: FormData) {
  await upsertItemAction(null, formData);
}

export async function upsertLocationInlineAction(formData: FormData) {
  await upsertLocationAction(null, formData);
}

export async function upsertSupplierInlineAction(formData: FormData) {
  await upsertSupplierAction(null, formData);
}


