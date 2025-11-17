/**
 * Receiving Actions (Refactored)
 * Thin wrappers around ReceivingService
 */

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getReceivingService } from '@/src/services/receiving';
import { isDomainError } from '@/src/domain/errors';
import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';
import logger from '@/lib/logger';

const receivingService = getReceivingService();

// Validation schemas
const createGoodsReceiptSchema = z.object({
  locationId: z.string().min(1, 'Location is required'),
  orderId: z.string().optional().nullable().transform((value) => value || null),
  supplierId: z.string().optional().nullable().transform((value) => value || null),
  notes: z.string().max(512).optional().transform((value) => value?.trim() || null),
});

const addReceiptLineSchema = z.object({
  receiptId: z.string().min(1, 'Receipt ID is required'),
  itemId: z.string().min(1, 'Item ID is required'),
  quantity: z.coerce.number().int('Quantity must be a whole number').positive('Quantity must be at least 1'),
  batchNumber: z.string().max(128, 'Batch number is too long').optional().nullable().transform((value) => value && value.trim() ? value.trim() : null),
  expiryDate: z.string().optional().nullable().transform((value) => value && value.trim() ? new Date(value) : null),
  scannedGtin: z.string().max(64, 'GTIN is too long').optional().nullable().transform((value) => value && value.trim() ? value.trim() : null),
  notes: z.string().max(256, 'Notes are too long').optional().nullable().transform((value) => value && value.trim() ? value.trim() : null),
});

const updateReceiptLineSchema = z.object({
  lineId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  batchNumber: z.string().max(128).optional().transform((value) => value?.trim() || null),
  expiryDate: z.string().optional().transform((value) => value ? new Date(value) : null),
  notes: z.string().max(256).optional().transform((value) => value?.trim() || null),
});

const searchItemByGtinSchema = z.object({
  gtin: z.string().min(1).max(64).transform((val) => val.trim()),
});

/**
 * Create a new goods receipt
 */
export async function createGoodsReceiptAction(_prevState: unknown, formData: FormData) {
  await verifyCsrfFromHeaders();
  
  let receiptId: string | null = null;
  
  try {
    const ctx = await buildRequestContext();

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

    // Create goods receipt using service
    const result = await receivingService.createGoodsReceipt(ctx, {
      locationId,
      orderId,
      supplierId,
      notes,
    });

    if (isDomainError(result)) {
      return { error: result.message } as const;
    }

    receiptId = result.id;
    revalidatePath('/receiving');
  } catch (error: any) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'createGoodsReceiptAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      locationId: formData.get('locationId'),
      orderId: formData.get('orderId'),
      supplierId: formData.get('supplierId'),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to create goods receipt');
    
    return { error: error.message || 'Failed to create receipt' } as const;
  }
  
  // Redirect outside try-catch so it can throw properly
  if (receiptId) {
    redirect(`/receiving/${receiptId}`);
  }
}

/**
 * Add a line item to a goods receipt
 */
export async function addReceiptLineAction(_prevState: unknown, formData: FormData) {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    // Preprocess form data to convert empty strings to null
    const rawData = {
      receiptId: formData.get('receiptId') as string,
      itemId: formData.get('itemId') as string,
      quantity: formData.get('quantity') as string,
      batchNumber: (formData.get('batchNumber') as string) || null,
      expiryDate: (formData.get('expiryDate') as string) || null,
      scannedGtin: (formData.get('scannedGtin') as string) || null,
      notes: (formData.get('notes') as string) || null,
    };

    const parsed = addReceiptLineSchema.safeParse(rawData);

    if (!parsed.success) {
      // Return the first validation error with specific message
      const firstError = parsed.error.issues[0];
      const errorMessage = firstError?.message || 'Invalid input';
      logger.warn({
        action: 'addReceiptLineAction',
        userId: ctx.userId,
        practiceId: ctx.practiceId,
        receiptId: rawData.receiptId,
        validationError: errorMessage,
      }, 'Validation failed when adding receipt line');
      return { error: errorMessage } as const;
    }

    const { receiptId, itemId, quantity, batchNumber, expiryDate, scannedGtin, notes } = parsed.data;

    // Add receipt line using service
    const result = await receivingService.addReceiptLine(ctx, receiptId, {
      itemId,
      quantity,
      batchNumber,
      expiryDate,
      scannedGtin,
      notes,
    });

    if (isDomainError(result)) {
      return { error: result.message } as const;
    }

    revalidatePath(`/receiving/${receiptId}`);
    return { success: 'Item added to receipt' } as const;
  } catch (error: any) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'addReceiptLineAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      receiptId: formData.get('receiptId'),
      itemId: formData.get('itemId'),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to add receipt line');
    return { error: error.message || 'Failed to add item' } as const;
  }
}

/**
 * Update a receipt line (quantity, batch, expiry)
 */
export async function updateReceiptLineAction(_prevState: unknown, formData: FormData) {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    const parsed = updateReceiptLineSchema.safeParse({
      lineId: formData.get('lineId'),
      quantity: formData.get('quantity'),
      batchNumber: formData.get('batchNumber'),
      expiryDate: formData.get('expiryDate'),
      notes: formData.get('notes'),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid line data' } as const;
    }

    const { lineId, quantity, batchNumber, expiryDate, notes } = parsed.data;

    // Update receipt line using service
    const result = await receivingService.updateReceiptLine(ctx, lineId, {
      quantity,
      batchNumber,
      expiryDate,
      notes,
    });

    if (isDomainError(result)) {
      return { error: result.message } as const;
    }

    revalidatePath(`/receiving/${result.id}`);
    return { success: 'Line updated' } as const;
  } catch (error: any) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'updateReceiptLineAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      lineId: formData.get('lineId'),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to update receipt line');
    return { error: error.message || 'Failed to update line' } as const;
  }
}

/**
 * Remove a line from a goods receipt
 */
export async function removeReceiptLineAction(lineId: string) {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    const result = await receivingService.removeReceiptLine(ctx, lineId);

    if (isDomainError(result)) {
      throw new Error(result.message);
    }

    revalidatePath(`/receiving/${result.id}`);
    revalidatePath('/receiving');
  } catch (error) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'removeReceiptLineAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      lineId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to remove receipt line');
    
    throw error;
  }
}

/**
 * Confirm a goods receipt (updates inventory)
 */
export async function confirmGoodsReceiptAction(receiptId: string) {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    // Confirm goods receipt using service
    const result = await receivingService.confirmGoodsReceipt(ctx, receiptId);

    if (isDomainError(result)) {
      throw new Error(result.message);
    }

    // Revalidate paths
    revalidatePath(`/receiving/${receiptId}`);
    revalidatePath('/receiving');
    revalidatePath('/inventory');
    revalidatePath('/dashboard');
    
    // If linked to an order, revalidate order pages
    if (result.orderId) {
      revalidatePath(`/orders/${result.orderId}`);
      revalidatePath('/orders');
    }

    // Return success with redirect target and warnings
    return {
      success: true,
      redirectTo: result.orderId ? `/orders/${result.orderId}` : '/receiving',
      lowStockWarnings: result.lowStockNotifications,
    } as const;
  } catch (error: any) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'confirmGoodsReceiptAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      receiptId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to confirm goods receipt');
    
    throw error;
  }
}

/**
 * Cancel a goods receipt
 */
export async function cancelGoodsReceiptAction(receiptId: string) {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    const result = await receivingService.cancelGoodsReceipt(ctx, receiptId);

    if (isDomainError(result)) {
      throw new Error(result.message);
    }

    revalidatePath(`/receiving/${receiptId}`);
    revalidatePath('/receiving');
  } catch (error) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'cancelGoodsReceiptAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      receiptId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to cancel goods receipt');
    
    throw error;
  }
}

/**
 * Delete a goods receipt (draft only)
 */
export async function deleteGoodsReceiptAction(receiptId: string) {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    const result = await receivingService.deleteGoodsReceipt(ctx, receiptId);

    if (isDomainError(result)) {
      throw new Error(result.message);
    }

    revalidatePath('/receiving');
  } catch (error) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'deleteGoodsReceiptAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      receiptId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to delete goods receipt');
    
    throw error;
  }
  
  redirect('/receiving');
}

/**
 * Search for an item by GTIN (for barcode scanning)
 */
export async function searchItemByGtinAction(gtin: string) {
  try {
    const ctx = await buildRequestContext();

    const parsed = searchItemByGtinSchema.safeParse({ gtin });

    if (!parsed.success) {
      return { error: 'Invalid GTIN' } as const;
    }

    // Search using receiving service's GTIN lookup
    const item = await receivingService.searchItemByGtin(ctx, parsed.data.gtin);

    if (!item) {
      logger.info({
        action: 'searchItemByGtinAction',
        userId: ctx.userId,
        practiceId: ctx.practiceId,
        gtin: parsed.data.gtin,
      }, 'Item not found for GTIN');
      return { error: 'Item not found' } as const;
    }

    return {
      success: true,
      item: {
        id: item.id,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
      },
    } as const;
  } catch (error: any) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'searchItemByGtinAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      gtin,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to search item by GTIN');
    return { error: error.message || 'Failed to search item' } as const;
  }
}


