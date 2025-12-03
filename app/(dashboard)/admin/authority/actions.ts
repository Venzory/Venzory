'use server';

import { auth } from '@/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { getSupplierItemRepository } from '@/src/repositories/suppliers';
import { ProductRepository } from '@/src/repositories/products';
import { QualityRepository } from '@/src/repositories/products/quality-repository';
import { getProductEnrichmentService } from '@/src/services/products';
import { revalidatePath } from 'next/cache';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// Types for triage items
export interface TriageItem {
  id: string;
  supplierName: string;
  supplierId: string;
  productId: string;
  productName: string;
  productGtin: string | null;
  productBrand: string | null;
  supplierSku: string | null;
  supplierItemName: string | null;
  supplierDescription: string | null;
  matchMethod: string;
  matchConfidence: number | null;
  needsReview: boolean;
  matchedAt: Date | null;
  matchedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Quality data
  missingFields: string[];
  qualityScore: number | null;
  // Duplicate detection
  duplicateCount: number;
}

export interface TriageFilters {
  issueType?: 'all' | 'needs-review' | 'low-confidence' | 'no-gtin' | 'fuzzy-match';
  supplierId?: string;
  search?: string;
}

export interface TriageStats {
  total: number;
  needsReview: number;
  lowConfidence: number;
  noGtin: number;
  fuzzyMatch: number;
}

/**
 * Get triage items with filtering and issue categorization
 */
export async function getTriageItems(
  filters: TriageFilters = {},
  limit: number = 50,
  offset: number = 0
): Promise<{ items: TriageItem[]; total: number }> {
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    throw new Error('Unauthorized');
  }

  const repository = getSupplierItemRepository();
  const qualityRepo = new QualityRepository();

  // Build where clause based on filters
  const whereConditions: any[] = [{ isActive: true }];

  // Base conditions for needing triage
  const triageConditions: any[] = [
    { needsReview: true },
    { matchConfidence: { lt: 0.9 } },
    { matchConfidence: null, matchMethod: 'MANUAL' },
  ];

  // Apply issue type filter
  if (filters.issueType && filters.issueType !== 'all') {
    switch (filters.issueType) {
      case 'needs-review':
        whereConditions.push({ needsReview: true });
        break;
      case 'low-confidence':
        whereConditions.push({ matchConfidence: { lt: 0.9 } });
        break;
      case 'no-gtin':
        whereConditions.push({ product: { gtin: null } });
        break;
      case 'fuzzy-match':
        whereConditions.push({ matchMethod: 'FUZZY_NAME' });
        break;
    }
  } else {
    whereConditions.push({ OR: triageConditions });
  }

  // Supplier filter
  if (filters.supplierId) {
    whereConditions.push({ globalSupplierId: filters.supplierId });
  }

  // Search filter
  if (filters.search) {
    whereConditions.push({
      OR: [
        { supplierName: { contains: filters.search, mode: 'insensitive' } },
        { supplierSku: { contains: filters.search, mode: 'insensitive' } },
        { product: { name: { contains: filters.search, mode: 'insensitive' } } },
        { product: { gtin: { contains: filters.search } } },
      ],
    });
  }

  const [items, total] = await Promise.all([
    prisma.supplierItem.findMany({
      where: { AND: whereConditions },
      include: {
        globalSupplier: { select: { id: true, name: true } },
        product: {
          select: {
            id: true,
            name: true,
            gtin: true,
            brand: true,
            qualityScore: true,
            _count: { select: { supplierItems: true } },
          },
        },
      },
      orderBy: [
        { needsReview: 'desc' },
        { matchConfidence: 'asc' },
        { createdAt: 'desc' },
      ],
      skip: offset,
      take: limit,
    }),
    prisma.supplierItem.count({ where: { AND: whereConditions } }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      supplierName: item.globalSupplier?.name ?? 'Unknown',
      supplierId: item.globalSupplierId,
      productId: item.productId,
      productName: item.product?.name ?? 'Unknown',
      productGtin: item.product?.gtin ?? null,
      productBrand: item.product?.brand ?? null,
      supplierSku: item.supplierSku ?? null,
      supplierItemName: item.supplierName ?? null,
      supplierDescription: item.supplierDescription ?? null,
      matchMethod: item.matchMethod ?? 'MANUAL',
      matchConfidence: item.matchConfidence ? Number(item.matchConfidence) : null,
      needsReview: item.needsReview ?? false,
      matchedAt: item.matchedAt,
      matchedBy: item.matchedBy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      missingFields: item.product?.qualityScore?.missingFields ?? [],
      qualityScore: item.product?.qualityScore?.overallScore ?? null,
      duplicateCount: item.product?._count?.supplierItems ?? 1,
    })),
    total,
  };
}

/**
 * Get statistics for triage dashboard
 */
export async function getTriageStats(): Promise<TriageStats> {
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    throw new Error('Unauthorized');
  }

  const [total, needsReview, lowConfidence, noGtin, fuzzyMatch] = await Promise.all([
    prisma.supplierItem.count({
      where: {
        isActive: true,
        OR: [
          { needsReview: true },
          { matchConfidence: { lt: 0.9 } },
          { matchConfidence: null, matchMethod: 'MANUAL' },
        ],
      },
    }),
    prisma.supplierItem.count({
      where: { isActive: true, needsReview: true },
    }),
    prisma.supplierItem.count({
      where: { isActive: true, matchConfidence: { lt: 0.9 } },
    }),
    prisma.supplierItem.count({
      where: { isActive: true, product: { gtin: null } },
    }),
    prisma.supplierItem.count({
      where: { isActive: true, matchMethod: 'FUZZY_NAME' },
    }),
  ]);

  return { total, needsReview, lowConfidence, noGtin, fuzzyMatch };
}

/**
 * Get full details for a specific supplier item (for inspector panel)
 */
export async function getItemDetails(supplierItemId: string) {
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    throw new Error('Unauthorized');
  }

  const item = await prisma.supplierItem.findUnique({
    where: { id: supplierItemId },
    include: {
      globalSupplier: true,
      product: {
        include: {
          qualityScore: true,
          supplierItems: {
            where: { isActive: true },
            include: {
              globalSupplier: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!item) return null;

  return {
    ...item,
    matchConfidence: item.matchConfidence ? Number(item.matchConfidence) : null,
    unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
  };
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
      module: 'AuthorityActions',
      operation: 'confirmMatch',
      supplierItemId,
      userId: session.user.id,
    }, 'Match confirmed');

    revalidatePath('/admin/authority');
    revalidatePath('/admin/gs1-quality');

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      module: 'AuthorityActions',
      operation: 'confirmMatch',
      supplierItemId,
      error: message,
    }, 'Failed to confirm match');

    return { success: false, error: message };
  }
}

/**
 * Reassign supplier item to a different product
 */
export async function reassignProduct(
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
      module: 'AuthorityActions',
      operation: 'reassignProduct',
      supplierItemId,
      newProductId,
      userId: session.user.id,
    }, 'Product reassigned');

    revalidatePath('/admin/authority');
    revalidatePath('/admin/gs1-quality');

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      module: 'AuthorityActions',
      operation: 'reassignProduct',
      supplierItemId,
      newProductId,
      error: message,
    }, 'Failed to reassign product');

    return { success: false, error: message };
  }
}

/**
 * Create a new product and link the supplier item to it
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
          module: 'AuthorityActions',
          operation: 'createProductAndLink',
          productId: product.id,
          error: enrichError instanceof Error ? enrichError.message : 'Unknown',
        }, 'GS1 enrichment failed (non-blocking)');
      }
    }

    logger.info({
      module: 'AuthorityActions',
      operation: 'createProductAndLink',
      supplierItemId,
      productId: product.id,
      userId: session.user.id,
    }, 'New product created and linked');

    revalidatePath('/admin/authority');
    revalidatePath('/admin/gs1-quality');
    revalidatePath('/admin/product-master');

    return { success: true, productId: product.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      module: 'AuthorityActions',
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
      module: 'AuthorityActions',
      operation: 'markIgnored',
      supplierItemId,
      userId: session.user.id,
    }, 'Supplier item marked as ignored');

    revalidatePath('/admin/authority');
    revalidatePath('/admin/gs1-quality');

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      module: 'AuthorityActions',
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

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    gtin: p.gtin,
    brand: p.brand,
    gs1VerificationStatus: p.gs1VerificationStatus,
  }));
}

/**
 * Merge two products - move all supplier items and practice items from source to target
 */
export async function mergeProducts(
  sourceProductId: string,
  targetProductId: string
): Promise<{ success: boolean; error?: string; mergedCount?: number }> {
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    return { success: false, error: 'Unauthorized' };
  }

  if (sourceProductId === targetProductId) {
    return { success: false, error: 'Cannot merge a product with itself' };
  }

  try {
    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Verify both products exist
      const [sourceProduct, targetProduct] = await Promise.all([
        tx.product.findUnique({
          where: { id: sourceProductId },
          include: { _count: { select: { supplierItems: true, items: true } } },
        }),
        tx.product.findUnique({ where: { id: targetProductId } }),
      ]);

      if (!sourceProduct) {
        throw new Error('Source product not found');
      }
      if (!targetProduct) {
        throw new Error('Target product not found');
      }

      // Move all supplier items to target product
      // Handle potential unique constraint violations by checking existing links
      const sourceSupplierItems = await tx.supplierItem.findMany({
        where: { productId: sourceProductId },
      });

      let movedSupplierItems = 0;
      for (const item of sourceSupplierItems) {
        // Check if target already has this supplier-product combination
        const existingLink = await tx.supplierItem.findUnique({
          where: {
            globalSupplierId_productId: {
              globalSupplierId: item.globalSupplierId,
              productId: targetProductId,
            },
          },
        });

        if (existingLink) {
          // Deactivate the source item since target already has this link
          await tx.supplierItem.update({
            where: { id: item.id },
            data: { isActive: false },
          });
        } else {
          // Move to target
          await tx.supplierItem.update({
            where: { id: item.id },
            data: { productId: targetProductId },
          });
          movedSupplierItems++;
        }
      }

      // Move all practice items to target product
      const sourcePracticeItems = await tx.item.findMany({
        where: { productId: sourceProductId },
      });

      let movedPracticeItems = 0;
      for (const item of sourcePracticeItems) {
        // Check if target already has this practice-item combination
        const existingItem = await tx.item.findFirst({
          where: {
            practiceId: item.practiceId,
            productId: targetProductId,
          },
        });

        if (!existingItem) {
          await tx.item.update({
            where: { id: item.id },
            data: { productId: targetProductId },
          });
          movedPracticeItems++;
        }
        // If exists, the source item will be orphaned but product deletion will handle it
      }

      // Delete quality score for source product
      await tx.productQualityScore.deleteMany({
        where: { productId: sourceProductId },
      });

      // Delete the source product (cascade will handle remaining relations)
      await tx.product.delete({
        where: { id: sourceProductId },
      });

      return { movedSupplierItems, movedPracticeItems };
    });

    logger.info({
      module: 'AuthorityActions',
      operation: 'mergeProducts',
      sourceProductId,
      targetProductId,
      movedSupplierItems: result.movedSupplierItems,
      movedPracticeItems: result.movedPracticeItems,
      userId: session.user.id,
    }, 'Products merged successfully');

    revalidatePath('/admin/authority');
    revalidatePath('/admin/product-master');
    revalidatePath('/admin/gs1-quality');

    return {
      success: true,
      mergedCount: result.movedSupplierItems + result.movedPracticeItems,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({
      module: 'AuthorityActions',
      operation: 'mergeProducts',
      sourceProductId,
      targetProductId,
      error: message,
    }, 'Failed to merge products');

    return { success: false, error: message };
  }
}

/**
 * Get list of suppliers for filter dropdown
 */
export async function getSuppliersList() {
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    throw new Error('Unauthorized');
  }

  const suppliers = await prisma.globalSupplier.findMany({
    where: {
      supplierItems: {
        some: { isActive: true },
      },
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          supplierItems: {
            where: {
              isActive: true,
              OR: [
                { needsReview: true },
                { matchConfidence: { lt: 0.9 } },
              ],
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    pendingCount: s._count.supplierItems,
  }));
}

