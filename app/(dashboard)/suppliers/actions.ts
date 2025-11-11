'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { hasRole } from '@/lib/rbac';
import { PracticeRole } from '@prisma/client';
import type { UpdatePracticeSupplierInput } from '@/src/domain/models/suppliers';

/**
 * Update practice-specific supplier settings
 */
export async function updatePracticeSupplierAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ success?: string; error?: string }> {
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

    // Build update input from form data
    const input: UpdatePracticeSupplierInput = {
      accountNumber: formData.get('accountNumber') as string | null,
      customLabel: formData.get('customLabel') as string | null,
      orderingNotes: formData.get('orderingNotes') as string | null,
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

    return { success: 'Supplier settings updated successfully.' };
  } catch (error) {
    console.error('Failed to update practice supplier:', error);
    return { error: 'Failed to update supplier settings. Please try again.' };
  }
}

/**
 * Unlink a supplier from the practice
 */
export async function unlinkPracticeSupplierAction(
  practiceSupplierId: string
): Promise<void> {
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
  } catch (error) {
    console.error('Failed to unlink practice supplier:', error);
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
      return { error: 'Supplier selection is required.' };
    }

    // Link via repository with default values
    const repository = getPracticeSupplierRepository();
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

    return { success: 'Supplier linked successfully.' };
  } catch (error: any) {
    console.error('Failed to link global supplier:', error);
    
    // Handle duplicate link error (unique constraint violation)
    if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
      return { error: 'This supplier is already linked to your practice.' };
    }

    return { error: 'Failed to link supplier. Please try again.' };
  }
}

