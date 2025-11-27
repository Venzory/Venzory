'use server';

import { auth } from '@/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { getSupplierItemRepository } from '@/src/repositories/suppliers';
import { ProductRepository } from '@/src/repositories/products';
import { getProductEnrichmentService } from '@/src/services/products';
import { revalidatePath } from 'next/cache';
import logger from '@/lib/logger';

/**
 * Get supplier items needing review
 */
export async function getItemsNeedingReview(limit: number = 50) {
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    throw new Error('Unauthorized');
  }

  const repository = getSupplierItemRepository();
  const items = await repository.findNeedingReview(limit, 0, 0.9);
  
  return items.map(item => ({
    id: item.id,
    supplierName: item.globalSupplier?.name ?? 'Unknown',
    productName: item.product?.name ?? 'Unknown',
    productId: item.productId,
    productGtin: item.product?.gtin ?? null,
    productBrand: item.product?.brand ?? null,
    supplierSku: item.supplierSku ?? null,
    supplierItemName: item.supplierName ?? null,
    matchMethod: item.matchMethod ?? 'MANUAL',
    matchConfidence: item.matchConfidence ? Number(item.matchConfidence) : null,
    needsReview: item.needsReview ?? false,
    createdAt: item.createdAt,
  }));
}

/**
 * Count items needing review
 */
export async function countItemsNeedingReview(): Promise<number> {
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    throw new Error('Unauthorized');
  }

  const repository = getSupplierItemRepository();
  return repository.countNeedingReview(0.9);
}

/**
 * Confirm the current match for a supplier item
 */
export async function confirmMatch(supplierItemId: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const repository = getSupplierItemRepository();
    await repository.confirmMatch(supplierItemId, session.user.id ?? session.user.email);
    
    logger.info({
      module: 'MatchReviewActions',
      operation: 'confirmMatch',
      supplierItemId,
      userId: session.user.id,
    }, 'Match confirmed');

    revalidatePath('/owner/match-review');
    revalidatePath('/owner/gs1-quality');
    
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      module: 'MatchReviewActions',
      operation: 'confirmMatch',
      supplierItemId,
      error: message,
    }, 'Failed to confirm match');
    
    return { success: false, error: message };
  }
}

/**
 * Change the product link for a supplier item
 */
export async function changeProduct(
  supplierItemId: string, 
  newProductId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const repository = getSupplierItemRepository();
    
    await repository.updateMatchResult(supplierItemId, {
      productId: newProductId,
      matchMethod: 'MANUAL',
      matchConfidence: 1.0,
      needsReview: false,
      matchedBy: session.user.id ?? session.user.email,
    });
    
    logger.info({
      module: 'MatchReviewActions',
      operation: 'changeProduct',
      supplierItemId,
      newProductId,
      userId: session.user.id,
    }, 'Product link changed');

    revalidatePath('/owner/match-review');
    revalidatePath('/owner/gs1-quality');
    
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      module: 'MatchReviewActions',
      operation: 'changeProduct',
      supplierItemId,
      newProductId,
      error: message,
    }, 'Failed to change product');
    
    return { success: false, error: message };
  }
}

/**
 * Create a new product and link it to the supplier item
 */
export async function createProductAndLink(
  supplierItemId: string,
  productData: {
    gtin?: string | null;
    name: string;
    brand?: string | null;
    description?: string | null;
  }
): Promise<{ success: boolean; productId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const productRepo = new ProductRepository();
    const supplierItemRepo = getSupplierItemRepository();
    
    // Create new product
    const product = await productRepo.createProduct({
      gtin: productData.gtin,
      name: productData.name,
      brand: productData.brand,
      description: productData.description,
      isGs1Product: !!productData.gtin,
    });
    
    // Update supplier item to link to new product
    await supplierItemRepo.updateMatchResult(supplierItemId, {
      productId: product.id,
      matchMethod: 'MANUAL',
      matchConfidence: 1.0,
      needsReview: false,
      matchedBy: session.user.id ?? session.user.email,
    });
    
    // Trigger GS1 enrichment if product has GTIN
    if (productData.gtin) {
      try {
        const enrichmentService = getProductEnrichmentService();
        await enrichmentService.enrichFromGdsn(product.id);
      } catch (enrichError) {
        logger.warn({
          module: 'MatchReviewActions',
          operation: 'createProductAndLink',
          productId: product.id,
          error: enrichError instanceof Error ? enrichError.message : 'Unknown',
        }, 'GS1 enrichment failed (non-blocking)');
      }
    }
    
    logger.info({
      module: 'MatchReviewActions',
      operation: 'createProductAndLink',
      supplierItemId,
      productId: product.id,
      userId: session.user.id,
    }, 'New product created and linked');

    revalidatePath('/owner/match-review');
    revalidatePath('/owner/gs1-quality');
    revalidatePath('/owner/product-master');
    
    return { success: true, productId: product.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      module: 'MatchReviewActions',
      operation: 'createProductAndLink',
      supplierItemId,
      error: message,
    }, 'Failed to create product');
    
    return { success: false, error: message };
  }
}

/**
 * Mark supplier item as ignored (deactivate)
 */
export async function markIgnored(supplierItemId: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const repository = getSupplierItemRepository();
    await repository.markIgnored(supplierItemId, session.user.id ?? session.user.email);
    
    logger.info({
      module: 'MatchReviewActions',
      operation: 'markIgnored',
      supplierItemId,
      userId: session.user.id,
    }, 'Supplier item marked as ignored');

    revalidatePath('/owner/match-review');
    revalidatePath('/owner/gs1-quality');
    
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      module: 'MatchReviewActions',
      operation: 'markIgnored',
      supplierItemId,
      error: message,
    }, 'Failed to mark as ignored');
    
    return { success: false, error: message };
  }
}

/**
 * Search products by GTIN or name
 */
export async function searchProducts(query: string, limit: number = 10) {
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    throw new Error('Unauthorized');
  }

  if (!query || query.length < 2) {
    return [];
  }

  const productRepo = new ProductRepository();
  const products = await productRepo.findProducts(
    { search: query },
    { pagination: { limit } }
  );
  
  return products.map(p => ({
    id: p.id,
    name: p.name,
    gtin: p.gtin,
    brand: p.brand,
    gs1VerificationStatus: p.gs1VerificationStatus,
  }));
}

