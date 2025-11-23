/**
 * Product Master Actions
 * Standalone actions for the Product Master Data module
 */

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getProductService } from '@/src/services/products';
import { isDomainError, ForbiddenError } from '@/src/domain/errors';
import { enrichProductWithGs1Data, isValidGtin } from '@/lib/integrations';
import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';
import { isPlatformOwner } from '@/lib/owner-guard';

const productService = getProductService();

// Validation schemas
const createProductSchema = z.object({
  gtin: z
    .string()
    .max(14)
    .optional()
    .transform((value) => value?.trim() || null)
    .refine(
      (value) => !value || isValidGtin(value),
      { message: 'Invalid GTIN format. Must be 8, 12, 13, or 14 digits.' }
    ),
  brand: z
    .string()
    .max(128)
    .optional()
    .transform((value) => value?.trim() || null),
  name: z.string().min(1, 'Name is required').max(255),
  description: z
    .string()
    .max(1024)
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : null)),
});

const updateProductSchema = z.object({
  productId: z.string().cuid(),
  brand: z
    .string()
    .max(128)
    .optional()
    .transform((value) => value?.trim() || null),
  name: z.string().min(1, 'Name is required').max(255),
  description: z
    .string()
    .max(1024)
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : null)),
});

export async function createProductAction(_prevState: unknown, formData: FormData) {
  await verifyCsrfFromHeaders();
  
  try {
    // Build request context
    const ctx = await buildRequestContext();

    // Enforce Owner Access
    if (!isPlatformOwner(ctx.userEmail)) {
        return { error: 'Only the platform owner can create products.' } as const;
    }

    // Parse and validate input
    const parsed = createProductSchema.safeParse({
      gtin: formData.get('gtin'),
      brand: formData.get('brand'),
      name: formData.get('name'),
      description: formData.get('description'),
    });

    if (!parsed.success) {
      const errors = parsed.error.flatten();
      return {
        error: errors.fieldErrors.gtin?.[0] || errors.fieldErrors.name?.[0] || 'Invalid product details',
      } as const;
    }

    const { gtin, brand, name, description } = parsed.data;

    // Create product via service
    const product = await productService.createProduct(ctx, {
      gtin,
      brand,
      name,
      description,
      isGs1Product: Boolean(gtin),
    });

    // Attempt GS1 enrichment in background if GTIN provided
    if (gtin) {
      enrichProductWithGs1Data(product.id).catch((err) => {
        console.error(`[Product Actions] GS1 enrichment failed for ${product.id}:`, err);
      });
    }

    revalidatePath('/product-master');
    return { success: 'Product created successfully', productId: product.id } as const;
  } catch (error) {
    console.error('[Product Actions] Error creating product:', error);
    
    if (isDomainError(error)) {
      return { error: error.message } as const;
    }
    
    return { error: 'Failed to create product. Please try again.' } as const;
  }
}

export async function updateProductAction(_prevState: unknown, formData: FormData) {
  await verifyCsrfFromHeaders();
  
  try {
    // Build request context
    const ctx = await buildRequestContext();

    // Enforce Owner Access
    if (!isPlatformOwner(ctx.userEmail)) {
        return { error: 'Only the platform owner can update products.' } as const;
    }

    // Parse and validate input
    const parsed = updateProductSchema.safeParse({
      productId: formData.get('productId'),
      brand: formData.get('brand'),
      name: formData.get('name'),
      description: formData.get('description'),
    });

    if (!parsed.success) {
      return { error: 'Invalid product details' } as const;
    }

    const { productId, brand, name, description } = parsed.data;

    // Update product via service
    await productService.updateProduct(ctx, productId, {
      brand,
      name,
      description,
    });

    revalidatePath('/product-master');
    revalidatePath(`/product-master/${productId}`);
    return { success: 'Product updated successfully' } as const;
  } catch (error) {
    console.error('[Product Actions] Error updating product:', error);
    
    if (isDomainError(error)) {
      return { error: error.message } as const;
    }
    
    return { error: 'Failed to update product. Please try again.' } as const;
  }
}

export async function triggerGs1LookupAction(productId: string) {
  await verifyCsrfFromHeaders();
  
  try {
    // Build request context
    const ctx = await buildRequestContext();

    // Enforce Owner Access
    if (!isPlatformOwner(ctx.userEmail)) {
        throw new ForbiddenError('Only the platform owner can trigger GS1 lookup.');
    }

    // Trigger GS1 lookup via service
    await productService.triggerGs1Lookup(ctx, productId);

    // Perform actual lookup (in background, but we'll do it synchronously for now)
    await enrichProductWithGs1Data(productId);

    revalidatePath('/product-master');
    revalidatePath(`/product-master/${productId}`);
  } catch (error) {
    console.error('[Product Actions] Error triggering GS1 lookup:', error);
    
    if (isDomainError(error)) {
      throw new Error(error.message);
    }
    
    throw new Error('Failed to lookup GS1 data');
  }
}

export async function deleteProductAction(productId: string) {
  await verifyCsrfFromHeaders();
  
  try {
    // Build request context
    const ctx = await buildRequestContext();

    // Enforce Owner Access
    if (!isPlatformOwner(ctx.userEmail)) {
        throw new ForbiddenError('Only the platform owner can delete products.');
    }

    // Delete product via service
    await productService.deleteProduct(ctx, productId);

    revalidatePath('/product-master');
  } catch (error: unknown) {
    console.error('[Product Actions] Error deleting product:', error);
    
    if (isDomainError(error)) {
      throw new Error(error.message);
    }
    
    const message = error instanceof Error ? error.message : 'Failed to delete product';
    throw new Error(message);
  }
}

