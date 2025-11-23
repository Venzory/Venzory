'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getItemService } from '@/src/services';
import { isDomainError } from '@/src/domain/errors';
import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';

const addToCatalogSchema = z.object({
  productId: z.string().min(1),
  globalSupplierId: z.string().min(1),
  name: z.string().min(1).max(255),
  sku: z.string().max(64).optional().nullable(),
  unit: z.string().max(32).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

/**
 * Add a product to the practice's catalog (create an Item)
 */
export async function addToCatalogAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ success?: string; error?: string; itemId?: string }> {
  await verifyCsrfFromHeaders();
  
  try {
    const ctx = await buildRequestContext();

    const parsed = addToCatalogSchema.safeParse({
      productId: formData.get('productId'),
      globalSupplierId: formData.get('globalSupplierId'),
      name: formData.get('name'),
      sku: formData.get('sku') || null,
      unit: formData.get('unit') || null,
      description: formData.get('description') || null,
    });

    if (!parsed.success) {
      return { error: 'Invalid input fields' };
    }

    const { productId, globalSupplierId, name, sku, unit, description } = parsed.data;

    // Create item from catalog
    const item = await getItemService().addItemFromCatalog(ctx, {
      productId,
      globalSupplierId,
      name,
      sku,
      unit,
      description,
    });

    revalidatePath('/supplier-catalog');
    revalidatePath('/my-items');
    revalidatePath('/inventory');
    
    return { 
      success: 'Product added to your catalog successfully', 
      itemId: item.id 
    };
  } catch (error) {
    console.error('[addToCatalogAction]', error);
    if (isDomainError(error)) {
      return { error: error.message };
    }
    return { error: 'An unexpected error occurred' };
  }
}

