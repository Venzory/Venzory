'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { hasRole } from '@/lib/rbac';
import { PracticeRole } from '@prisma/client';
import type { UpdatePracticeSupplierInput } from '@/src/domain/models/suppliers';
import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';
import { toAppError } from '@/src/lib/app-error';

/**
 * Update practice-specific supplier settings
 */
export async function updatePracticeSupplierAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ success?: string; error?: string }> {
  await verifyCsrfFromHeaders();
  
  try {
    const { session, practiceId } = await requireActivePractice();

    // Check RBAC - minimum STAFF role required
    const canManage = hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    });

    if (!canManage) {
      return { error: 'You do not have permission to edit supplier settings.' };
    }

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
      practiceId,
      input
    );

    revalidatePath('/suppliers');
    revalidatePath(`/suppliers/${practiceSupplierId}`);
    revalidatePath('/inventory');
    revalidatePath('/dashboard');

    return { success: 'Supplier settings updated successfully.' };
  } catch (error: unknown) {
    console.error('Failed to update practice supplier:', error);
    
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
  
  const { session, practiceId } = await requireActivePractice();
  
  try {
    // Check RBAC - minimum STAFF role required
    const canManage = hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    });

    if (!canManage) {
      throw new Error('You do not have permission to remove suppliers.');
    }

    // Unlink via repository
    const repository = getPracticeSupplierRepository();
    await repository.unlinkPracticeSupplier(practiceSupplierId, practiceId);

    revalidatePath('/suppliers');
    revalidatePath('/inventory');
    revalidatePath('/dashboard');
  } catch (error: unknown) {
    console.error('Failed to unlink practice supplier:', error);
    
    const appError = toAppError(error);
    
    // Provide clearer error messages
    if (appError.code === 'P2025') {
      throw new Error('Supplier not found. It may have already been removed.');
    }
    
    // If foreign key constraint fails (P2003), soft delete by blocking instead
    if (appError.code === 'P2003') {
      try {
        const repository = getPracticeSupplierRepository();
        await repository.updatePracticeSupplier(practiceSupplierId, practiceId, {
          isBlocked: true,
          isPreferred: false, // Also remove preferred status
        });
        
        revalidatePath('/suppliers');
        revalidatePath('/inventory');
        revalidatePath('/dashboard');
        
        // Successfully blocked, so we can proceed to redirect
        return;
      } catch (updateError) {
        console.error('Failed to soft-delete (block) supplier:', updateError);
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
    const { session, practiceId } = await requireActivePractice();

    // Check RBAC - minimum STAFF role required
    const canManage = hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    });

    if (!canManage) {
      return { error: 'You do not have permission to add suppliers.' };
    }

    const globalSupplierId = formData.get('globalSupplierId') as string;
    if (!globalSupplierId) {
      return { error: 'Please select a supplier to link.' };
    }

    // Link via repository with default values
    const repository = getPracticeSupplierRepository();
    
    try {
      await repository.linkPracticeToGlobalSupplier({
        practiceId,
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
    console.error('Failed to link global supplier:', error);
    return { error: 'Failed to link supplier. Please try again.' };
  }
}

