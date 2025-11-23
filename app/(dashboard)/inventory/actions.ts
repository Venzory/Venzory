/**
 * Inventory Actions (Refactored)
 * Thin wrappers around InventoryService
 */

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { buildRequestContext, requireRole } from '@/src/lib/context/context-builder';
import { getInventoryService, getItemService } from '@/src/services/inventory';
import { getOrCreateProductForItem } from '@/lib/integrations';
import { isDomainError } from '@/src/domain/errors';
import { UserRepository } from '@/src/repositories/users';
import { LocationRepository } from '@/src/repositories/locations';
import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';
import logger from '@/lib/logger';

const inventoryService = getInventoryService();
const itemService = getItemService();
// Note: Supplier CRUD operations use UserRepository directly
// These are simple CRUD operations without complex business logic
// TODO: Consider moving to InventoryService or SettingsService in future refactoring
const userRepository = new UserRepository();
// Location operations now use LocationRepository for enhanced safety and validation
const locationRepository = new LocationRepository();

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
  defaultPracticeSupplierId: z
    .string()
    .optional()
    .transform((value) => (value && value !== 'none' ? value : null)),
  gtin: z
    .string()
    .max(14, 'GTIN must be 14 characters or less')
    .optional()
    .transform((value) => value?.trim() || null)
    .refine(
      (value) => !value || /^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(value),
      { message: 'Invalid GTIN format. Must be 8, 12, 13, or 14 digits' }
    ),
  brand: z
    .string()
    .max(128)
    .optional()
    .transform((value) => value?.trim() || null),
  // Optional pricing fields for supplier
  supplierSku: z.string().max(64).optional().transform((value) => value?.trim() || null),
  unitPrice: z.coerce.number().positive().optional().nullable(),
  currency: z.string().max(3).optional().transform((value) => value?.trim() || 'EUR'),
  minOrderQty: z.coerce.number().int().positive().optional().nullable(),
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
  itemId: z.string().min(1, 'Item is required'),
  locationId: z.string().min(1, 'Location is required'),
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
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    const parsed = upsertItemSchema.safeParse({
      itemId: formData.get('itemId') ?? undefined,
      name: formData.get('name'),
      sku: formData.get('sku'),
      description: formData.get('description'),
      unit: formData.get('unit'),
      defaultSupplierId: formData.get('defaultSupplierId'),
      defaultPracticeSupplierId: formData.get('defaultPracticeSupplierId'),
      gtin: formData.get('gtin'),
      brand: formData.get('brand'),
      supplierSku: formData.get('supplierSku'),
      unitPrice: formData.get('unitPrice'),
      currency: formData.get('currency'),
      minOrderQty: formData.get('minOrderQty'),
    });

    if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors } as const;
    }

    const { 
      itemId, 
      gtin, 
      brand, 
      name, 
      description, 
      sku, 
      unit, 
      defaultSupplierId,
      defaultPracticeSupplierId,
      supplierSku,
      unitPrice,
      currency,
      minOrderQty,
    } = parsed.data;

    if (itemId) {
      // Update existing item
      await itemService.updateItem(ctx, itemId, {
        name,
        description,
        sku,
        unit,
        defaultPracticeSupplierId,
        supplierSku,
        unitPrice,
        currency,
        minOrderQty,
      });
    } else {
      // Create new item - get or create product first
      const productId = await getOrCreateProductForItem(
        name,
        gtin ?? undefined,
        brand ?? undefined,
        description ?? undefined
      );

      await itemService.createItem(ctx, {
        productId,
        name,
        description,
        sku,
        unit,
        defaultPracticeSupplierId,
        supplierSku,
        unitPrice,
        currency,
        minOrderQty,
      });
    }

    revalidatePath('/inventory');
    revalidatePath('/dashboard');
    return { success: itemId ? 'Item updated' : 'Item created' } as const;
  } catch (error) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'upsertItemAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      itemId: formData.get('itemId'),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to upsert inventory item');
    
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
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();
    await inventoryService.deleteItem(ctx, itemId);
    revalidatePath('/inventory');
    revalidatePath('/my-items');
  } catch (error) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'deleteItemAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      itemId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to delete inventory item');
    
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
  await verifyCsrfFromHeaders();
  
  const payload = {
    locationId: formData.get('locationId') ?? undefined,
    name: formData.get('name'),
    code: formData.get('code'),
    description: formData.get('description'),
    parentId: formData.get('parentId'),
  };
  
  try {
    const ctx = await buildRequestContext();
    
    // Check permissions
    requireRole(ctx, 'STAFF');

    if (payload.locationId) {
      const parsed = updateLocationSchema.safeParse(payload);
      if (!parsed.success) {
        return { errors: parsed.error.flatten().fieldErrors };
      }

      const { locationId, ...values } = parsed.data;
      await locationRepository.updateLocation(locationId, ctx.practiceId, values);
    } else {
      const parsed = createLocationSchema.safeParse(payload);
      if (!parsed.success) {
        return { errors: parsed.error.flatten().fieldErrors };
      }

      await locationRepository.createLocation(ctx.practiceId, parsed.data);
    }

    revalidatePath('/locations');
    revalidatePath('/inventory');
    revalidatePath('/stock-count/new');
    return { success: payload.locationId ? 'Location updated' : 'Location created' };
  } catch (error) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'upsertLocationAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      locationId: payload.locationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to upsert location');
    
    if (isDomainError(error)) {
      return { error: error.message };
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Delete location
 */
export async function deleteLocationAction(locationId: string) {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();
    // Check permissions
    requireRole(ctx, 'STAFF');
    
    await locationRepository.deleteLocation(locationId, ctx.practiceId);
    revalidatePath('/locations');
    revalidatePath('/inventory');
    revalidatePath('/stock-count/new');
  } catch (error) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'deleteLocationAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      locationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to delete location');
    
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
  await verifyCsrfFromHeaders();
  
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
      return { errors: parsed.error.flatten().fieldErrors };
    }

    await inventoryService.adjustStock(ctx, parsed.data);

    revalidatePath('/inventory');
    revalidatePath('/dashboard');
    revalidatePath('/locations');
    return { success: 'Stock adjustment recorded' };
  } catch (error) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'createStockAdjustmentAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      itemId: formData.get('itemId'),
      locationId: formData.get('locationId'),
      quantity: formData.get('quantity'),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to create stock adjustment');
    
    if (isDomainError(error)) {
      return { error: error.message };
    }
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'An unexpected error occurred' };
  }
}

/**
 * Update inventory settings (min/max/reorder)
 */
export async function updateStockSettingsAction(_prevState: unknown, formData: FormData) {
  await verifyCsrfFromHeaders();
  
  const schema = z.object({
    itemId: z.string().cuid(),
    locationId: z.string().cuid(),
    reorderPoint: z.coerce.number().int().nonnegative().nullable().optional(),
    reorderQuantity: z.coerce.number().int().positive().nullable().optional(),
    maxStock: z.coerce.number().int().nonnegative().nullable().optional(),
  });

  try {
    const ctx = await buildRequestContext();

    // Handle empty strings as null
    const rawData = {
      itemId: formData.get('itemId'),
      locationId: formData.get('locationId'),
      reorderPoint: formData.get('reorderPoint') === '' ? null : formData.get('reorderPoint'),
      reorderQuantity: formData.get('reorderQuantity') === '' ? null : formData.get('reorderQuantity'),
      maxStock: formData.get('maxStock') === '' ? null : formData.get('maxStock'),
    };

    const parsed = schema.safeParse(rawData);

    if (!parsed.success) {
      return { errors: parsed.error.flatten().fieldErrors };
    }

    const { itemId, locationId, reorderPoint, reorderQuantity, maxStock } = parsed.data;

    await inventoryService.updateStockSettings(ctx, itemId, locationId, {
      reorderPoint: reorderPoint ?? null,
      reorderQuantity: reorderQuantity ?? null,
      maxStock: maxStock ?? null,
    });

    revalidatePath('/inventory');
    revalidatePath('/reorder-suggestions');
    return { success: 'Inventory settings updated' };
  } catch (error) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'updateStockSettingsAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      itemId: formData.get('itemId'),
      locationId: formData.get('locationId'),
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to update stock settings');
    
    if (isDomainError(error)) {
      return { error: error.message };
    }
    return { error: 'An unexpected error occurred' };
  }
}

// Inline wrappers (no return value)
export async function upsertItemInlineAction(formData: FormData) {
  await verifyCsrfFromHeaders();
  await upsertItemAction(null, formData);
}

export async function upsertLocationInlineAction(formData: FormData) {
  await verifyCsrfFromHeaders();
  await upsertLocationAction(null, formData);
}

