'use server';

import { revalidatePath } from 'next/cache';

import logger from '@/lib/logger';
import { buildRequestContext, requireRole } from '@/src/lib/context/context-builder';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import type { UpdatePracticeSupplierInput } from '@/src/domain/models/suppliers';
import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';
import { toAppError } from '@/src/lib/app-error';
import { isDomainError } from '@/src/domain/errors';

/**
 * Update practice-specific supplier settings
 */
export async function updatePracticeSupplierAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ success?: string; error?: string }> {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    // Check RBAC - minimum STAFF role required
    requireRole(ctx, 'STAFF');

    const practiceSupplierId = formData.get('practiceSupplierId') as string;
    if (!practiceSupplierId) {
      return { error: 'Supplier ID is required.' };
    }

    // Helper to normalize empty strings to null
    const normalizeString = (value: string | null): string | null => {
      if (!value || value.trim() === '') return null;
      return value.trim();
    };

    // Build update input from form data
    const input: UpdatePracticeSupplierInput = {
      accountNumber: normalizeString(formData.get('accountNumber') as string | null),
      customLabel: normalizeString(formData.get('customLabel') as string | null),
      orderingNotes: normalizeString(formData.get('orderingNotes') as string | null),
      isPreferred: formData.get('isPreferred') === 'true',
      isBlocked: formData.get('isBlocked') === 'true',
    };

    // Update via repository
    const repository = getPracticeSupplierRepository();
    await repository.updatePracticeSupplier(
      practiceSupplierId,
      ctx.practiceId,
      input
    );

    revalidatePath('/suppliers');
    revalidatePath(`/suppliers/${practiceSupplierId}`);
    revalidatePath('/inventory');
    revalidatePath('/dashboard');

    return { success: 'Supplier settings updated successfully.' };
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to update practice supplier');
    
    if (isDomainError(error)) {
      return { error: error.message };
    }

    const appError = toAppError(error);
    
    // Handle specific error cases
    if (appError.code === 'P2025') {
      return { error: 'Supplier not found. It may have been removed.' };
    }
    
    if (appError.message.includes('not found') || appError.code === 'NOT_FOUND') {
      return { error: 'Supplier not found in your practice.' };
    }
    
    return { error: 'Failed to update supplier settings. Please try again.' };
  }
}

/**
 * Unlink a supplier from the practice
 */
export async function unlinkPracticeSupplierAction(
  practiceSupplierId: string
): Promise<void> {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    // Check RBAC - minimum STAFF role required
    requireRole(ctx, 'STAFF');

    // Unlink via repository
    const repository = getPracticeSupplierRepository();
    await repository.unlinkPracticeSupplier(practiceSupplierId, ctx.practiceId);

    revalidatePath('/suppliers');
    revalidatePath('/inventory');
    revalidatePath('/dashboard');
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to unlink practice supplier');
    
    if (isDomainError(error)) {
      throw new Error(error.message);
    }

    const appError = toAppError(error);
    
    // Provide clearer error messages
    if (appError.code === 'P2025') {
      throw new Error('Supplier not found. It may have already been removed.');
    }
    
    // If foreign key constraint fails (P2003), soft delete by blocking instead
    if (appError.code === 'P2003') {
      try {
        // Re-build context just in case, or reuse if in same scope (we are in catch block of same scope)
        // But we need practiceId. We can't easily access 'ctx' from try block unless defined outside.
        // Let's assume we need to rebuild or just fail if we can't recover ctx.
        // Actually, this is tricky inside catch.
        // Better to define ctx outside try? No, buildRequestContext throws.
        // We'll retry building context or assume it failed before context was built?
        // If context build failed, we can't proceed anyway.
        
        // However, if we are here, ctx might have been built successfully.
        // Let's re-fetch context for the recovery attempt.
        const ctx = await buildRequestContext();
        
        const repository = getPracticeSupplierRepository();
        await repository.updatePracticeSupplier(practiceSupplierId, ctx.practiceId, {
          isBlocked: true,
          isPreferred: false, // Also remove preferred status
        });
        
        revalidatePath('/suppliers');
        revalidatePath('/inventory');
        revalidatePath('/dashboard');
        
        // Successfully blocked, so we can proceed to redirect (void return)
        return;
      } catch (updateError) {
        logger.error({ error: updateError }, 'Failed to soft-delete (block) supplier');
        // Fall through to throw original error if update fails
      }
    }

    if (appError.message.includes('not found') || appError.code === 'NOT_FOUND') {
      throw new Error('Supplier not found in your practice.');
    }
    
    throw error;
  }
}

/**
 * Link an existing GlobalSupplier to the practice
 */
export async function linkGlobalSupplierAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ success?: string; error?: string }> {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    // Check RBAC - minimum STAFF role required
    requireRole(ctx, 'STAFF');

    const globalSupplierId = formData.get('globalSupplierId') as string;
    if (!globalSupplierId) {
      return { error: 'Please select a supplier to link.' };
    }

    // Link via repository with default values
    const repository = getPracticeSupplierRepository();
    
    try {
      await repository.linkPracticeToGlobalSupplier({
        practiceId: ctx.practiceId,
        globalSupplierId,
        // Default values - user can edit these after linking
        accountNumber: null,
        customLabel: null,
        orderingNotes: null,
        isPreferred: false,
        isBlocked: false,
      });

      revalidatePath('/suppliers');
      revalidatePath('/inventory');
      revalidatePath('/dashboard');

      return { success: 'Supplier linked successfully.' };
    } catch (linkError: unknown) {
      const appError = toAppError(linkError);
      
      // Handle duplicate link error (unique constraint violation)
      if (appError.code === 'P2002' || appError.message.includes('Unique constraint')) {
        return { error: 'This supplier is already linked to your practice.' };
      }
      
      // Handle supplier not found
      if (appError.code === 'P2025' || appError.message.includes('not found')) {
        return { error: 'The selected supplier could not be found.' };
      }
      
      throw linkError;
    }
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to link global supplier');
    
    if (isDomainError(error)) {
      return { error: error.message };
    }

    return { error: 'Failed to link supplier. Please try again.' };
  }
}
