'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';
import { isPlatformOwner } from '@/lib/owner-guard';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getProductService } from '@/src/services';
import { isDomainError } from '@/src/domain/errors';

const decimalField = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? undefined : value;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}, z.number().min(0).nullable());

const integerField = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return undefined;
  return Math.trunc(parsed);
}, z.number().int().min(1).nullable());

const booleanField = z.preprocess((value) => {
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return undefined;
}, z.boolean());

const updateSupplierItemSchema = z.object({
  productId: z.string().min(1),
  globalSupplierId: z.string().min(1),
  supplierSku: z.string().max(128).optional().nullable(),
  currency: z.string().max(8).optional().nullable(),
  unitPrice: decimalField,
  minOrderQty: integerField,
  isActive: booleanField,
});

export async function updateSupplierItemAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ success?: string; error?: string }> {
  await verifyCsrfFromHeaders();

  try {
    const ctx = await buildRequestContext();

    if (!isPlatformOwner(ctx.userEmail)) {
      return { error: 'Only the platform owner can edit the global supplier catalog.' };
    }

    const parsed = updateSupplierItemSchema.safeParse({
      productId: formData.get('productId'),
      globalSupplierId: formData.get('globalSupplierId'),
      supplierSku: formData.get('supplierSku'),
      currency: formData.get('currency'),
      unitPrice: formData.get('unitPrice'),
      minOrderQty: formData.get('minOrderQty'),
      isActive: formData.get('isActive'),
    });

    if (!parsed.success) {
      return { error: 'Invalid form input. Please double-check the values.' };
    }

    const { productId, globalSupplierId, supplierSku, currency, unitPrice, minOrderQty, isActive } = parsed.data;

    await getProductService().upsertSupplierCatalog(ctx, {
      productId,
      globalSupplierId,
      supplierSku: supplierSku ?? null,
      currency: currency ?? null,
      unitPrice,
      minOrderQty,
      isActive,
    });

    revalidatePath('/admin/supplier-catalog');
    return { success: 'Supplier entry updated successfully.' };
  } catch (error) {
    console.error('[updateSupplierItemAction]', error);
    if (isDomainError(error)) {
      return { error: error.message };
    }
    return { error: 'An unexpected error occurred while updating the supplier entry.' };
  }
}

