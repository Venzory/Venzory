/**
 * Stock Count Actions (Refactored)
 * Thin wrappers around InventoryService stock count methods
 */

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getInventoryService } from '@/src/services/inventory';
import { isDomainError, ConcurrencyError } from '@/src/domain/errors';
import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';
import logger from '@/lib/logger';

const inventoryService = getInventoryService();

// Validation schemas
const createStockCountSessionSchema = z.object({
  locationId: z.string().min(1, 'Location is required'),
  notes: z.string().max(512).optional().transform((value) => value?.trim() || null),
});

const addCountLineSchema = z.object({
  sessionId: z.string().min(1),
  itemId: z.string().min(1),
  countedQuantity: z.coerce.number().int().min(0),
  notes: z.string().max(256).optional().transform((value) => value?.trim() || null),
});

const updateCountLineSchema = z.object({
  lineId: z.string().min(1),
  countedQuantity: z.coerce.number().int().min(0),
  notes: z.string().max(256).optional().transform((value) => value?.trim() || null),
});

export async function createStockCountSessionAction(_prevState: unknown, formData: FormData) {
  await verifyCsrfFromHeaders();
  
  try {
    // Build request context
    const ctx = await buildRequestContext();

    // Parse and validate input
    const parsed = createStockCountSessionSchema.safeParse({
      locationId: formData.get('locationId'),
      notes: formData.get('notes'),
    });

    if (!parsed.success) {
      return { error: 'Invalid session details' } as const;
    }

    const { locationId, notes } = parsed.data;

    // Create session via service
    const { id: sessionId } = await inventoryService.createStockCountSession(
      ctx,
      locationId,
      notes
    );

    revalidatePath('/stock-count');
    return { success: true, sessionId } as const;
  } catch (error) {
    console.error('[Stock Count Actions] Error creating session:', error);
    
    if (isDomainError(error)) {
      return { error: error.message } as const;
    }
    
    return { error: 'Failed to create stock count session' } as const;
  }
}

export async function addCountLineAction(_prevState: unknown, formData: FormData) {
  await verifyCsrfFromHeaders();
  
  try {
    // Build request context
    const ctx = await buildRequestContext();

    // Parse and validate input
    const parsed = addCountLineSchema.safeParse({
      sessionId: formData.get('sessionId'),
      itemId: formData.get('itemId'),
      countedQuantity: formData.get('countedQuantity'),
      notes: formData.get('notes'),
    });

    if (!parsed.success) {
      return { error: 'Invalid line details' } as const;
    }

    const { sessionId, itemId, countedQuantity, notes } = parsed.data;

    // Add count line via service
    const { lineId, variance } = await inventoryService.addCountLine(
      ctx,
      sessionId,
      itemId,
      countedQuantity,
      notes
    );

    revalidatePath(`/stock-count/${sessionId}`);
    return { success: true, variance, lineId } as const;
  } catch (error) {
    console.error('[Stock Count Actions] Error adding line:', error);
    
    if (isDomainError(error)) {
      return { error: error.message } as const;
    }
    
    return { error: 'Failed to add count line' } as const;
  }
}

export async function updateCountLineAction(_prevState: unknown, formData: FormData) {
  await verifyCsrfFromHeaders();
  
  try {
    // Build request context
    const ctx = await buildRequestContext();

    // Parse and validate input
    const parsed = updateCountLineSchema.safeParse({
      lineId: formData.get('lineId'),
      countedQuantity: formData.get('countedQuantity'),
      notes: formData.get('notes'),
    });

    if (!parsed.success) {
      return { error: 'Invalid line details' } as const;
    }

    const { lineId, countedQuantity, notes } = parsed.data;

    // Update count line via service
    const { variance } = await inventoryService.updateCountLine(
      ctx,
      lineId,
      countedQuantity,
      notes
    );

    // Extract sessionId from the line to revalidate specific session page
    const sessionIdFromForm = formData.get('sessionId') as string | null;
    revalidatePath(`/stock-count`);
    if (sessionIdFromForm) {
      revalidatePath(`/stock-count/${sessionIdFromForm}`);
    }
    return { success: true, variance } as const;
  } catch (error) {
    console.error('[Stock Count Actions] Error updating line:', error);
    
    if (isDomainError(error)) {
      return { error: error.message } as const;
    }
    
    return { error: 'Failed to update count line' } as const;
  }
}

export async function removeCountLineAction(lineId: string) {
  await verifyCsrfFromHeaders();
  
  try {
    // Build request context
    const ctx = await buildRequestContext();

    // Remove count line via service
    await inventoryService.removeCountLine(ctx, lineId);

    revalidatePath('/stock-count');
    // Note: Session-specific revalidation handled by calling component via router.refresh()
  } catch (error) {
    console.error('[Stock Count Actions] Error removing line:', error);
    
    if (isDomainError(error)) {
      throw new Error(error.message);
    }
    
    throw new Error('Failed to remove count line');
  }
}

export async function completeStockCountAction(sessionId: string, applyAdjustments: boolean, adminOverride: boolean = false) {
  await verifyCsrfFromHeaders();
  
  try {
    // Build request context
    const ctx = await buildRequestContext();

    // Complete stock count via service
    const { adjustedItems, warnings } = await inventoryService.completeStockCount(
      ctx,
      sessionId,
      applyAdjustments,
      adminOverride
    );

    revalidatePath('/stock-count');
    revalidatePath(`/stock-count/${sessionId}`);
    revalidatePath('/inventory');
    revalidatePath('/dashboard');
    revalidatePath('/locations');

    return { success: true, adjustedItems, warnings } as const;
  } catch (error) {
    const ctx = await buildRequestContext().catch(() => null);
    logger.error({
      action: 'completeStockCountAction',
      userId: ctx?.userId,
      practiceId: ctx?.practiceId,
      sessionId,
      applyAdjustments,
      adminOverride,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to complete stock count session');
    
    if (isDomainError(error)) {
      if (error.code === 'CONCURRENCY_CONFLICT') {
        return {
          success: false,
          error: 'CONCURRENCY_CONFLICT',
          changes: (error.details?.changes || []) as Array<{
            itemId: string;
            itemName: string;
            systemAtCount: number;
            systemNow: number;
            difference: number;
          }>,
        } as const;
      }
      return {
        success: false,
        error: error.message,
      } as const;
    }
    
    return {
      success: false,
      error: 'Failed to complete stock count',
    } as const;
  }
}

export async function cancelStockCountAction(sessionId: string) {
  await verifyCsrfFromHeaders();
  
  try {
    // Build request context
    const ctx = await buildRequestContext();

    // Cancel stock count via service
    await inventoryService.cancelStockCount(ctx, sessionId);

    revalidatePath('/stock-count');
    revalidatePath(`/stock-count/${sessionId}`);
  } catch (error) {
    console.error('[Stock Count Actions] Error cancelling session:', error);
    
    if (isDomainError(error)) {
      throw new Error(error.message);
    }
    
    throw new Error('Failed to cancel stock count');
  }
}

export async function deleteStockCountSessionAction(sessionId: string) {
  await verifyCsrfFromHeaders();
  
  try {
    // Build request context
    const ctx = await buildRequestContext();

    // Delete stock count session via service
    await inventoryService.deleteStockCountSession(ctx, sessionId);

    revalidatePath('/stock-count');
    redirect('/stock-count');
  } catch (error: unknown) {
    console.error('[Stock Count Actions] Error deleting session:', error);
    
    if (isDomainError(error)) {
      throw new Error(error.message);
    }
    
    const message = error instanceof Error ? error.message : 'Failed to delete stock count session';
    throw new Error(message);
  }
}

