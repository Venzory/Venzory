'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { getSupplierContext } from '@/lib/supplier-guard';
import { prisma } from '@/lib/prisma';
import { getSupplierCorrectionRepository } from '@/src/repositories/suppliers';
import { validateGtin } from '@/lib/gtin-validation';
import logger from '@/lib/logger';

// Validation schemas
const saveCorrectionSchema = z.object({
  supplierItemId: z.string().min(1),
  unitPrice: z.preprocess(
    (val) => (val === '' || val === null ? null : Number(val)),
    z.number().min(0).nullable()
  ),
  minOrderQty: z.preprocess(
    (val) => (val === '' || val === null ? null : Number(val)),
    z.number().int().min(1).nullable()
  ),
  supplierDescription: z.string().max(2000).nullable().optional(),
  gtin: z.string().max(14).nullable().optional(),
});

export type SaveCorrectionInput = z.infer<typeof saveCorrectionSchema>;

/**
 * Save a draft correction for a supplier item
 */
export async function saveCorrectionAction(
  input: SaveCorrectionInput
): Promise<{ success: boolean; error?: string; correctionId?: string }> {
  try {
    const session = await auth();
    const supplierContext = await getSupplierContext(session?.user?.email);

    if (!supplierContext) {
      return { success: false, error: 'Unauthorized - supplier access required' };
    }

    const parsed = saveCorrectionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: 'Invalid input data' };
    }

    const { supplierItemId, unitPrice, minOrderQty, supplierDescription, gtin } = parsed.data;

    // Validate GTIN if provided
    if (gtin && gtin.trim() !== '') {
      const gtinResult = validateGtin(gtin);
      if (!gtinResult.valid) {
        return { success: false, error: `Invalid GTIN: ${gtinResult.error}` };
      }
    }

    // Fetch the supplier item to verify ownership and get original data
    const supplierItem = await prisma.supplierItem.findFirst({
      where: {
        id: supplierItemId,
        globalSupplierId: supplierContext.supplierId,
        isActive: true,
      },
      include: {
        product: {
          select: {
            id: true,
            gtin: true,
            name: true,
          },
        },
      },
    });

    if (!supplierItem) {
      return { success: false, error: 'Supplier item not found or access denied' };
    }

    const repo = getSupplierCorrectionRepository();

    // Check for existing draft correction
    const existingDraft = await repo.findDraftBySupplierItemId(
      supplierItemId,
      supplierContext.supplierId
    );

    const originalData = {
      unitPrice: supplierItem.unitPrice?.toNumber() ?? null,
      minOrderQty: supplierItem.minOrderQty,
      supplierDescription: supplierItem.supplierDescription,
      gtin: supplierItem.product?.gtin ?? null,
    };

    const proposedData = {
      unitPrice,
      minOrderQty,
      supplierDescription: supplierDescription ?? null,
      gtin: gtin?.trim() || null,
    };

    // Check if any changes were made
    const hasChanges = 
      originalData.unitPrice !== proposedData.unitPrice ||
      originalData.minOrderQty !== proposedData.minOrderQty ||
      originalData.supplierDescription !== proposedData.supplierDescription ||
      originalData.gtin !== proposedData.gtin;

    if (!hasChanges) {
      // If no changes, delete existing draft if there is one
      if (existingDraft) {
        await repo.deleteDraft(existingDraft.id, supplierContext.supplierId);
      }
      revalidatePath('/supplier/items');
      return { success: true };
    }

    let correctionId: string;

    if (existingDraft) {
      // Update existing draft
      const updated = await repo.update(existingDraft.id, {
        proposedData,
      });
      correctionId = updated.id;
    } else {
      // Create new draft
      const created = await repo.create({
        supplierItemId,
        globalSupplierId: supplierContext.supplierId,
        originalData,
        proposedData,
      });
      correctionId = created.id;
    }

    logger.info({
      module: 'SupplierItemActions',
      operation: 'saveCorrectionAction',
      supplierItemId,
      correctionId,
      supplierId: supplierContext.supplierId,
    }, 'Draft correction saved');

    revalidatePath('/supplier/items');
    return { success: true, correctionId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      module: 'SupplierItemActions',
      operation: 'saveCorrectionAction',
      error: message,
    }, 'Failed to save correction');

    return { success: false, error: 'Failed to save correction' };
  }
}

/**
 * Submit all draft corrections for review
 */
export async function submitCorrectionsAction(): Promise<{
  success: boolean;
  error?: string;
  submittedCount?: number;
}> {
  try {
    const session = await auth();
    const supplierContext = await getSupplierContext(session?.user?.email);

    if (!supplierContext) {
      return { success: false, error: 'Unauthorized - supplier access required' };
    }

    const repo = getSupplierCorrectionRepository();

    // Get all draft corrections to validate GTINs before submitting
    const drafts = await repo.findDraftsBySupplier(supplierContext.supplierId);

    if (drafts.length === 0) {
      return { success: false, error: 'No draft corrections to submit' };
    }

    // Validate all GTIN changes before submitting
    for (const draft of drafts) {
      const proposedData = draft.proposedData as { gtin?: string | null };
      if (proposedData.gtin && proposedData.gtin.trim() !== '') {
        const gtinResult = validateGtin(proposedData.gtin);
        if (!gtinResult.valid) {
          return { 
            success: false, 
            error: `Invalid GTIN in correction for ${draft.supplierItem?.product?.name ?? 'item'}: ${gtinResult.error}` 
          };
        }
      }
    }

    // Submit all drafts
    const submittedCount = await repo.submitDrafts(supplierContext.supplierId);

    logger.info({
      module: 'SupplierItemActions',
      operation: 'submitCorrectionsAction',
      supplierId: supplierContext.supplierId,
      submittedCount,
    }, 'Corrections submitted for review');

    revalidatePath('/supplier/items');
    revalidatePath('/admin/supplier-corrections');
    
    return { success: true, submittedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      module: 'SupplierItemActions',
      operation: 'submitCorrectionsAction',
      error: message,
    }, 'Failed to submit corrections');

    return { success: false, error: 'Failed to submit corrections' };
  }
}

/**
 * Delete a draft correction
 */
export async function deleteDraftCorrectionAction(
  correctionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    const supplierContext = await getSupplierContext(session?.user?.email);

    if (!supplierContext) {
      return { success: false, error: 'Unauthorized - supplier access required' };
    }

    const repo = getSupplierCorrectionRepository();
    const deleted = await repo.deleteDraft(correctionId, supplierContext.supplierId);

    if (!deleted) {
      return { success: false, error: 'Draft correction not found or cannot be deleted' };
    }

    logger.info({
      module: 'SupplierItemActions',
      operation: 'deleteDraftCorrectionAction',
      correctionId,
      supplierId: supplierContext.supplierId,
    }, 'Draft correction deleted');

    revalidatePath('/supplier/items');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      module: 'SupplierItemActions',
      operation: 'deleteDraftCorrectionAction',
      error: message,
    }, 'Failed to delete draft correction');

    return { success: false, error: 'Failed to delete draft correction' };
  }
}

/**
 * Get correction status counts for the supplier
 */
export async function getCorrectionStatsAction(): Promise<{
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
} | null> {
  try {
    const session = await auth();
    const supplierContext = await getSupplierContext(session?.user?.email);

    if (!supplierContext) {
      return null;
    }

    const repo = getSupplierCorrectionRepository();
    return repo.countByStatus(supplierContext.supplierId);
  } catch (error) {
    logger.error({
      module: 'SupplierItemActions',
      operation: 'getCorrectionStatsAction',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to get correction stats');

    return null;
  }
}

