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
  practiceSupplierId: z.string().optional().nullable().transform((value) => value || null),
  notes: z.string().max(512).optional().transform((value) => value?.trim() || null),
});

const addReceiptLineSchema = z.object({
  receiptId: z.string().min(1, 'Receipt ID is required'),
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.coerce.number().int('Quantity must be a whole number').min(0).max(999999, 'Quantity is too large'),
  batchNumber: z.string().max(128, 'Batch number is too long').optional().nullable().transform((value) => value && value.trim() ? value.trim() : null),
  expiryDate: z.string().optional().nullable().transform((value) => {
    if (!value || !value.trim()) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date;
  }),
  scannedGtin: z.string().max(64, 'GTIN is too long').optional().nullable().transform((value) => value && value.trim() ? value.trim() : null),
  notes: z.string().max(256, 'Notes are too long').optional().nullable().transform((value) => value && value.trim() ? value.trim() : null),
  skipped: z.coerce.boolean().optional().default(false),
});

const updateReceiptLineSchema = z.object({
  lineId: z.string().min(1, 'Line ID is required'),
  quantity: z.coerce.number().int('Quantity must be a whole number').positive('Quantity must be at least 1').max(999999, 'Quantity is too large'),
  batchNumber: z.string().max(128, 'Batch number is too long').optional().transform((value) => value?.trim() || null),
  expiryDate: z.string().optional().transform((value) => {
    if (!value || !value.trim()) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date;
  }),
  notes: z.string().max(256, 'Notes are too long').optional().transform((value) => value?.trim() || null),
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
      practiceSupplierId: formData.get('supplierId'), // Form field is still named supplierId
      notes: formData.get('notes'),
    });

    if (!parsed.success) {
      return { error: 'Invalid receipt details' } as const;
    }

    const { locationId, orderId, practiceSupplierId, notes } = parsed.data;

    // Validate ad-hoc receiving requirements
    if (!orderId) {
      // Ensure user is ADMIN
      if (ctx.role !== 'ADMIN') {
        return { error: 'Receiving must be linked to an existing order.' } as const;
      }

      // Ensure supplier is present
      if (!practiceSupplierId) {
        return { error: 'Supplier is required for ad-hoc receiving.' } as const;
      }

      // Ensure notes (reason) is present
      if (!notes) {
        return { error: 'Reason (Notes) is required for ad-hoc receiving.' } as const;
      }
    }

    // Create goods receipt using service
    const result = await receivingService.createGoodsReceipt(ctx, {
      locationId,
      orderId,
      practiceSupplierId,
      notes,
    });

    if (isDomainError(result)) {
      return { error: result.message } as const;
    }

    receiptId = result.id;
    revalidatePath('/receiving');
  } catch (error: unknown) {
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
    
    const message = error instanceof Error ? error.message : 'Failed to create receipt';
    return { error: message } as const;
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

    const { receiptId, itemId, quantity, batchNumber, expiryDate, scannedGtin, notes, skipped } = parsed.data;

    // Add receipt line using service
    const result = await receivingService.addReceiptLine(ctx, receiptId, {
      itemId,
      quantity,
      batchNumber,
      expiryDate,
      scannedGtin,
      notes,
      skipped,
    });

    if (isDomainError(result)) {
      return { error: result.message } as const;
    }

    revalidatePath(`/receiving/${receiptId}`);
    return { success: 'Item added to receipt' } as const;
  } catch (error: unknown) {
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
    const message = error instanceof Error ? error.message : 'Failed to add item';
    return { error: message } as const;
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
  } catch (error: unknown) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'updateReceiptLineAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      lineId: formData.get('lineId'),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to update receipt line');
    const message = error instanceof Error ? error.message : 'Failed to update line';
    return { error: message } as const;
  }
}

/**
 * Remove a line from a goods receipt
 */
export async function removeReceiptLineAction(lineId: string) {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    // Validate line ID
    if (!lineId || typeof lineId !== 'string' || lineId.trim().length === 0) {
      throw new Error('Invalid line ID');
    }

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
export async function confirmGoodsReceiptAction(receiptId: string, backorderItemIds?: string[]) {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    // Validate receipt ID
    if (!receiptId || typeof receiptId !== 'string' || receiptId.trim().length === 0) {
      throw new Error('Invalid receipt ID');
    }

    // Confirm goods receipt using service (pass backorder item IDs if provided)
    const result = await receivingService.confirmGoodsReceipt(ctx, receiptId, backorderItemIds);

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
      lowStockWarnings: result.lowStockNotifications || [],
    } as const;
  } catch (error: unknown) {
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

    // Validate receipt ID
    if (!receiptId || typeof receiptId !== 'string' || receiptId.trim().length === 0) {
      throw new Error('Invalid receipt ID');
    }

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

    // Validate receipt ID
    if (!receiptId || typeof receiptId !== 'string' || receiptId.trim().length === 0) {
      throw new Error('Invalid receipt ID');
    }

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

// Schema for bulk line updates
const bulkLineSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().min(0).max(999999),
  batchNumber: z.string().max(128).optional().nullable().transform((v) => v?.trim() || null),
  expiryDate: z.string().optional().nullable().transform((v) => {
    if (!v?.trim()) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }),
  notes: z.string().max(256).optional().nullable().transform((v) => v?.trim() || null),
  lineId: z.string().optional().nullable(),
});

const bulkUpdateSchema = z.object({
  receiptId: z.string().min(1, 'Receipt ID is required'),
  lines: z.array(bulkLineSchema).min(1, 'At least one line is required'),
});

/**
 * Bulk update/create receipt lines (for bulk receiving workflow)
 */
export async function bulkUpdateReceiptLinesAction(data: {
  receiptId: string;
  lines: Array<{
    itemId: string;
    quantity: number;
    batchNumber?: string | null;
    expiryDate?: string | null;
    notes?: string | null;
    lineId?: string | null;
  }>;
}) {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await buildRequestContext();

    const parsed = bulkUpdateSchema.safeParse(data);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input';
      return { error: firstError } as const;
    }

    const { receiptId, lines } = parsed.data;
    const results: { itemId: string; success: boolean; error?: string }[] = [];

    for (const line of lines) {
      try {
        if (line.lineId) {
          // Update existing line
          const result = await receivingService.updateReceiptLine(ctx, line.lineId, {
            quantity: line.quantity,
            batchNumber: line.batchNumber,
            expiryDate: line.expiryDate,
            notes: line.notes,
          });

          if (isDomainError(result)) {
            results.push({ itemId: line.itemId, success: false, error: result.message });
          } else {
            results.push({ itemId: line.itemId, success: true });
          }
        } else if (line.quantity > 0) {
          // Add new line only if quantity > 0
          const result = await receivingService.addReceiptLine(ctx, receiptId, {
            itemId: line.itemId,
            quantity: line.quantity,
            batchNumber: line.batchNumber,
            expiryDate: line.expiryDate,
            notes: line.notes,
          });

          if (isDomainError(result)) {
            results.push({ itemId: line.itemId, success: false, error: result.message });
          } else {
            results.push({ itemId: line.itemId, success: true });
          }
        } else {
          // Skip lines with 0 quantity and no existing lineId
          results.push({ itemId: line.itemId, success: true });
        }
      } catch (error) {
        results.push({
          itemId: line.itemId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    revalidatePath(`/receiving/${receiptId}`);

    const failedCount = results.filter((r) => !r.success).length;
    if (failedCount > 0) {
      return {
        success: false,
        error: `${failedCount} of ${lines.length} lines failed to save`,
        results,
      } as const;
    }

    return { success: true, results } as const;
  } catch (error: unknown) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'bulkUpdateReceiptLinesAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      receiptId: data.receiptId,
      lineCount: data.lines?.length,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to bulk update receipt lines');

    return { error: error instanceof Error ? error.message : 'Failed to save lines' } as const;
  }
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
  } catch (error: unknown) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'searchItemByGtinAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      gtin,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to search item by GTIN');
    const message = error instanceof Error ? error.message : 'Failed to search item';
    return { error: message } as const;
  }
}

// ============================================
// MISMATCH TRACKING ACTIONS
// ============================================

// Schema for mismatch logging
const mismatchItemSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(['SHORT', 'OVER', 'DAMAGE', 'SUBSTITUTION']),
  orderedQuantity: z.number().int().min(0),
  receivedQuantity: z.number().int().min(0),
  note: z.string().max(500).optional().nullable(),
});

const confirmWithMismatchesSchema = z.object({
  receiptId: z.string().min(1, 'Receipt ID is required'),
  mismatches: z.array(mismatchItemSchema).optional(),
  backorderItemIds: z.array(z.string().min(1)).optional(),
});

/**
 * Confirm goods receipt with optional mismatch logging
 * This is the primary action for the enhanced receiving workflow
 */
export async function confirmReceiptWithMismatchesAction(data: {
  receiptId: string;
  mismatches?: Array<{
    itemId: string;
    type: 'SHORT' | 'OVER' | 'DAMAGE' | 'SUBSTITUTION';
    orderedQuantity: number;
    receivedQuantity: number;
    note?: string | null;
  }>;
  backorderItemIds?: string[]; // Items marked as expected backorders
}) {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await buildRequestContext();

    const parsed = confirmWithMismatchesSchema.safeParse(data);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input';
      return { error: firstError } as const;
    }

    const { receiptId, mismatches, backorderItemIds } = parsed.data;

    // Log mismatches if provided
    if (mismatches && mismatches.length > 0) {
      await receivingService.logReceivingMismatches(ctx, receiptId, mismatches.map((m) => ({
        itemId: m.itemId,
        type: m.type as any, // MismatchType enum
        orderedQuantity: m.orderedQuantity,
        receivedQuantity: m.receivedQuantity,
        note: m.note ?? undefined,
      })));
    }

    // Confirm the receipt (pass backorder item IDs)
    const result = await receivingService.confirmGoodsReceipt(ctx, receiptId, backorderItemIds);

    if (isDomainError(result)) {
      return { error: result.message } as const;
    }

    // Revalidate paths
    revalidatePath(`/receiving/${receiptId}`);
    revalidatePath('/receiving');
    revalidatePath('/receiving/mismatches');
    revalidatePath('/inventory');
    revalidatePath('/dashboard');

    if (result.orderId) {
      revalidatePath(`/orders/${result.orderId}`);
      revalidatePath('/orders');
    }

    return {
      success: true,
      redirectTo: result.orderId ? `/orders/${result.orderId}` : '/receiving',
      lowStockWarnings: result.lowStockNotifications || [],
      mismatchesLogged: mismatches?.length ?? 0,
    } as const;
  } catch (error: unknown) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'confirmReceiptWithMismatchesAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      receiptId: data.receiptId,
      mismatchCount: data.mismatches?.length,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to confirm receipt with mismatches');

    const message = error instanceof Error ? error.message : 'Failed to confirm receipt';
    return { error: message } as const;
  }
}

/**
 * Get mismatches for the current practice
 */
export async function getMismatchesAction(filters?: {
  status?: 'OPEN' | 'RESOLVED' | 'NEEDS_SUPPLIER_CORRECTION';
  type?: 'SHORT' | 'OVER' | 'DAMAGE' | 'SUBSTITUTION';
  practiceSupplierId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const ctx = await buildRequestContext();

    const mismatchFilters: any = {};

    if (filters?.status) {
      mismatchFilters.status = filters.status;
    }
    if (filters?.type) {
      mismatchFilters.type = filters.type;
    }
    if (filters?.practiceSupplierId) {
      mismatchFilters.practiceSupplierId = filters.practiceSupplierId;
    }
    if (filters?.dateFrom) {
      mismatchFilters.dateFrom = new Date(filters.dateFrom);
    }
    if (filters?.dateTo) {
      mismatchFilters.dateTo = new Date(filters.dateTo);
    }

    const mismatches = await receivingService.getMismatchesForPractice(ctx, mismatchFilters);

    return { success: true, mismatches } as const;
  } catch (error: unknown) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'getMismatchesAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      filters,
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to get mismatches');

    return { error: error instanceof Error ? error.message : 'Failed to get mismatches' } as const;
  }
}

/**
 * Get mismatch counts by status for dashboard
 */
export async function getMismatchCountsAction() {
  try {
    const ctx = await buildRequestContext();
    const counts = await receivingService.getMismatchCounts(ctx);
    return { success: true, counts } as const;
  } catch (error: unknown) {
    logger.error({
      action: 'getMismatchCountsAction',
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to get mismatch counts');
    return { error: 'Failed to get mismatch counts' } as const;
  }
}

/**
 * Resolve a mismatch
 */
export async function resolveMismatchAction(mismatchId: string, resolutionNote?: string) {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await buildRequestContext();

    if (!mismatchId || typeof mismatchId !== 'string') {
      return { error: 'Invalid mismatch ID' } as const;
    }

    const mismatch = await receivingService.resolveMismatch(ctx, mismatchId, resolutionNote);

    revalidatePath('/receiving/mismatches');
    revalidatePath('/dashboard');

    return { success: true, mismatch } as const;
  } catch (error: unknown) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'resolveMismatchAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      mismatchId,
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to resolve mismatch');

    return { error: error instanceof Error ? error.message : 'Failed to resolve mismatch' } as const;
  }
}

/**
 * Flag mismatch for supplier correction
 */
export async function flagMismatchForSupplierAction(mismatchId: string, note?: string) {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await buildRequestContext();

    if (!mismatchId || typeof mismatchId !== 'string') {
      return { error: 'Invalid mismatch ID' } as const;
    }

    const mismatch = await receivingService.flagMismatchForSupplier(ctx, mismatchId, note);

    revalidatePath('/receiving/mismatches');
    revalidatePath('/dashboard');

    return { success: true, mismatch } as const;
  } catch (error: unknown) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'flagMismatchForSupplierAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      mismatchId,
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to flag mismatch for supplier');

    return { error: error instanceof Error ? error.message : 'Failed to flag mismatch' } as const;
  }
}

/**
 * Append a note to an existing mismatch
 */
export async function appendMismatchNoteAction(mismatchId: string, note: string) {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await buildRequestContext();

    if (!mismatchId || typeof mismatchId !== 'string') {
      return { error: 'Invalid mismatch ID' } as const;
    }

    if (!note || note.trim().length === 0) {
      return { error: 'Note is required' } as const;
    }

    const mismatch = await receivingService.appendMismatchNote(ctx, mismatchId, note.trim());

    revalidatePath('/receiving/mismatches');

    return { success: true, mismatch } as const;
  } catch (error: unknown) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'appendMismatchNoteAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      mismatchId,
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to append mismatch note');

    return { error: error instanceof Error ? error.message : 'Failed to add note' } as const;
  }
}

