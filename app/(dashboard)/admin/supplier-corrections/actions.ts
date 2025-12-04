'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { prisma } from '@/lib/prisma';
import { getSupplierCorrectionRepository } from '@/src/repositories/suppliers';
import { validateGtin } from '@/lib/gtin-validation';
import logger from '@/lib/logger';

/**
 * Approve a supplier correction and apply changes
 */
export async function approveCorrectionAction(
  correctionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();

    if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
      return { success: false, error: 'Unauthorized - admin access required' };
    }

    const repo = getSupplierCorrectionRepository();
    const correction = await repo.findById(correctionId);

    if (!correction) {
      return { success: false, error: 'Correction not found' };
    }

    if (correction.status !== 'PENDING') {
      return { success: false, error: 'Only pending corrections can be approved' };
    }

    const proposedData = correction.proposedData as {
      unitPrice?: number | null;
      minOrderQty?: number | null;
      supplierDescription?: string | null;
      gtin?: string | null;
    };

    // Validate GTIN if changed
    if (proposedData.gtin && proposedData.gtin.trim() !== '') {
      const gtinResult = validateGtin(proposedData.gtin);
      if (!gtinResult.valid) {
        return { success: false, error: `Invalid GTIN: ${gtinResult.error}` };
      }
    }

    // Apply changes in a transaction
    await prisma.$transaction(async (tx) => {
      // Update the supplier item
      await tx.supplierItem.update({
        where: { id: correction.supplierItemId },
        data: {
          unitPrice: proposedData.unitPrice,
          minOrderQty: proposedData.minOrderQty,
          supplierDescription: proposedData.supplierDescription,
        },
      });

      // If GTIN changed, we need to update the product (or create a note for manual review)
      // For now, we'll log the GTIN change - actual product GTIN updates require more complex logic
      if (proposedData.gtin) {
        const supplierItem = await tx.supplierItem.findUnique({
          where: { id: correction.supplierItemId },
          include: { product: true },
        });

        if (supplierItem?.product && supplierItem.product.gtin !== proposedData.gtin) {
          // Log the GTIN change request - actual update would require product master review
          logger.info({
            module: 'SupplierCorrectionActions',
            operation: 'approveCorrectionAction',
            correctionId,
            productId: supplierItem.productId,
            oldGtin: supplierItem.product.gtin,
            newGtin: proposedData.gtin,
          }, 'GTIN change approved - product update may be required');
        }
      }

      // Mark correction as approved
      await tx.supplierCorrection.update({
        where: { id: correctionId },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedBy: session.user?.id ?? session.user?.email ?? 'admin',
        },
      });
    });

    logger.info({
      module: 'SupplierCorrectionActions',
      operation: 'approveCorrectionAction',
      correctionId,
      supplierItemId: correction.supplierItemId,
      reviewedBy: session.user?.email,
    }, 'Correction approved');

    revalidatePath('/admin/supplier-corrections');
    revalidatePath('/supplier/items');

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      module: 'SupplierCorrectionActions',
      operation: 'approveCorrectionAction',
      error: message,
    }, 'Failed to approve correction');

    return { success: false, error: 'Failed to approve correction' };
  }
}

/**
 * Reject a supplier correction
 */
export async function rejectCorrectionAction(
  correctionId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();

    if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
      return { success: false, error: 'Unauthorized - admin access required' };
    }

    const repo = getSupplierCorrectionRepository();
    const correction = await repo.findById(correctionId);

    if (!correction) {
      return { success: false, error: 'Correction not found' };
    }

    if (correction.status !== 'PENDING') {
      return { success: false, error: 'Only pending corrections can be rejected' };
    }

    // Mark correction as rejected
    await repo.update(correctionId, {
      status: 'REJECTED',
      reviewedAt: new Date(),
      reviewedBy: session.user?.id ?? session.user?.email ?? 'admin',
      reviewNotes: reason || null,
    });

    logger.info({
      module: 'SupplierCorrectionActions',
      operation: 'rejectCorrectionAction',
      correctionId,
      supplierItemId: correction.supplierItemId,
      reviewedBy: session.user?.email,
      reason,
    }, 'Correction rejected');

    revalidatePath('/admin/supplier-corrections');
    revalidatePath('/supplier/items');

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      module: 'SupplierCorrectionActions',
      operation: 'rejectCorrectionAction',
      error: message,
    }, 'Failed to reject correction');

    return { success: false, error: 'Failed to reject correction' };
  }
}

/**
 * Get pending corrections count (for badge)
 */
export async function getPendingCorrectionCountAction(): Promise<number> {
  try {
    const session = await auth();

    if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
      return 0;
    }

    const repo = getSupplierCorrectionRepository();
    return repo.countPending();
  } catch (error) {
    return 0;
  }
}

