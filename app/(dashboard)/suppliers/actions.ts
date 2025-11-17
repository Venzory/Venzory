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
  } catch (error: any) {
    console.error('Failed to update practice supplier:', error);
    
    // Handle specific error cases
    if (error?.code === 'P2025') {
      return { error: 'Supplier not found. It may have been removed.' };
    }
    
    if (error?.message?.includes('not found') || error?.name === 'NotFoundError') {
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
    const { session, practiceId } = await requireActivePractice();

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
  } catch (error: any) {
    console.error('Failed to unlink practice supplier:', error);
    
    // Provide clearer error messages
    if (error?.code === 'P2025') {
      throw new Error('Supplier not found. It may have already been removed.');
    }
    
    if (error?.message?.includes('not found') || error?.name === 'NotFoundError') {
      throw new Error('Supplier not found in your practice.');
    }
    
    throw error;
  }

  redirect('/suppliers');
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
    } catch (linkError: any) {
      // Handle duplicate link error (unique constraint violation)
      if (linkError?.code === 'P2002' || linkError?.message?.includes('Unique constraint')) {
        return { error: 'This supplier is already linked to your practice.' };
      }
      
      // Handle supplier not found
      if (linkError?.code === 'P2025' || linkError?.message?.includes('not found')) {
        return { error: 'The selected supplier could not be found.' };
      }
      
      throw linkError;
    }
  } catch (error: any) {
    console.error('Failed to link global supplier:', error);
    return { error: 'Failed to link supplier. Please try again.' };
  }
}

