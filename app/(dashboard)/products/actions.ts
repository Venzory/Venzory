'use server';

import { PracticeRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/rbac';
import { isValidGtin, enrichProductWithGs1Data } from '@/lib/integrations';

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
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.ADMIN,
    })
  ) {
    return { error: 'Insufficient permissions' } as const;
  }

  const parsed = createProductSchema.safeParse({
    gtin: formData.get('gtin'),
    brand: formData.get('brand'),
    name: formData.get('name'),
    description: formData.get('description'),
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten();
    return { 
      error: errors.fieldErrors.gtin?.[0] || errors.fieldErrors.name?.[0] || 'Invalid product details' 
    } as const;
  }

  const { gtin, brand, name, description } = parsed.data;

  // Check if a product with this GTIN already exists
  if (gtin) {
    const existing = await prisma.product.findUnique({
      where: { gtin },
      select: { id: true },
    });

    if (existing) {
      return { error: 'A product with this GTIN already exists' } as const;
    }
  }

  try {
    const product = await prisma.product.create({
      data: {
        gtin,
        brand,
        name,
        description,
        isGs1Product: Boolean(gtin),
        gs1VerificationStatus: gtin ? 'UNVERIFIED' : 'UNVERIFIED',
      },
    });

    // Attempt GS1 enrichment in background if GTIN provided
    if (gtin) {
      enrichProductWithGs1Data(product.id).catch((err) => {
        console.error(`[Product Actions] GS1 enrichment failed for ${product.id}:`, err);
      });
    }

    revalidatePath('/products');
    return { success: 'Product created successfully', productId: product.id } as const;
  } catch (error) {
    console.error('[Product Actions] Error creating product:', error);
    return { error: 'Failed to create product. Please try again.' } as const;
  }
}

export async function updateProductAction(_prevState: unknown, formData: FormData) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.ADMIN,
    })
  ) {
    return { error: 'Insufficient permissions' } as const;
  }

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

  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        brand,
        name,
        description,
      },
    });

    revalidatePath('/products');
    revalidatePath(`/products/${productId}`);
    return { success: 'Product updated successfully' } as const;
  } catch (error) {
    console.error('[Product Actions] Error updating product:', error);
    return { error: 'Failed to update product. Please try again.' } as const;
  }
}

export async function triggerGs1LookupAction(productId: string) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.ADMIN,
    })
  ) {
    throw new Error('Insufficient permissions');
  }

  try {
    await enrichProductWithGs1Data(productId);
    revalidatePath('/products');
    revalidatePath(`/products/${productId}`);
  } catch (error) {
    console.error('[Product Actions] Error triggering GS1 lookup:', error);
    throw new Error('Failed to lookup GS1 data');
  }
}

export async function deleteProductAction(productId: string) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.ADMIN,
    })
  ) {
    throw new Error('Insufficient permissions');
  }

  try {
    // Check if product has any items
    const itemCount = await prisma.item.count({
      where: { productId },
    });

    if (itemCount > 0) {
      throw new Error('Cannot delete product that is used by inventory items');
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    revalidatePath('/products');
  } catch (error: any) {
    console.error('[Product Actions] Error deleting product:', error);
    throw new Error(error.message || 'Failed to delete product');
  }
}

