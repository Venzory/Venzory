import { Prisma, MatchMethod } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';
import { SupplierItem, UpsertSupplierItemInput } from '@/src/domain/models';

export interface UpdateMatchResultInput {
  productId?: string;
  matchMethod?: MatchMethod;
  matchConfidence?: number;
  needsReview?: boolean;
  matchedBy?: string;
}

export interface SupplierItemWithRelations extends SupplierItem {
  globalSupplier?: { id: string; name: string };
  product?: { id: string; name: string; gtin: string | null; brand: string | null };
}

export class SupplierItemRepository extends BaseRepository {
  /**
   * Find supplier item by global supplier ID and GTIN
   */
  async findBySupplierAndGtin(
    globalSupplierId: string, 
    gtin: string, 
    options?: FindOptions
  ): Promise<SupplierItem | null> {
    const client = this.getClient(options?.tx);
    
    const item = await client.supplierItem.findFirst({
      where: {
        globalSupplierId,
        product: {
          gtin,
        },
      },
      include: options?.include,
    });
    
    return item as SupplierItem | null;
  }

  /**
   * Find supplier item by global supplier ID and product ID
   */
  async findBySupplierAndProductId(
    globalSupplierId: string, 
    productId: string, 
    options?: FindOptions
  ): Promise<SupplierItem | null> {
    const client = this.getClient(options?.tx);
    
    const item = await client.supplierItem.findUnique({
      where: {
        globalSupplierId_productId: {
          globalSupplierId,
          productId,
        },
      },
      include: options?.include,
    });
    
    return item as SupplierItem | null;
  }

  /**
   * Find all items for a global supplier
   */
  async findByGlobalSupplierId(
    globalSupplierId: string,
    options?: FindOptions
  ): Promise<SupplierItem[]> {
    const client = this.getClient(options?.tx);

    const items = await client.supplierItem.findMany({
      where: {
        globalSupplierId,
      },
      include: options?.include,
      orderBy: {
        product: {
          name: 'asc'
        }
      }
    });

    return items as SupplierItem[];
  }

  /**
   * Create or update global supplier item
   */
  async upsertGlobalItem(
    input: UpsertSupplierItemInput, 
    options?: RepositoryOptions
  ): Promise<SupplierItem> {
    const client = this.getClient(options?.tx);
    
    const item = await client.supplierItem.upsert({
      where: {
        globalSupplierId_productId: {
          globalSupplierId: input.globalSupplierId,
          productId: input.productId,
        },
      },
      create: {
        globalSupplierId: input.globalSupplierId,
        productId: input.productId,
        supplierSku: input.supplierSku,
        unitPrice: input.unitPrice,
        currency: input.currency ?? 'EUR',
        minOrderQty: input.minOrderQty ?? 1,
        integrationType: input.integrationType ?? 'MANUAL',
        integrationConfig: input.integrationConfig as Prisma.InputJsonValue,
        isActive: input.isActive ?? true,
      },
      update: {
        supplierSku: input.supplierSku,
        unitPrice: input.unitPrice,
        currency: input.currency,
        minOrderQty: input.minOrderQty,
        integrationType: input.integrationType,
        integrationConfig: input.integrationConfig as Prisma.InputJsonValue,
        isActive: input.isActive,
        lastSyncAt: new Date(),
      },
    });
    
    return item as SupplierItem;
  }

  /**
   * Find supplier items needing manual review
   * Items where needsReview = true OR matchConfidence < threshold
   */
  async findNeedingReview(
    limit: number = 50,
    offset: number = 0,
    confidenceThreshold: number = 0.9,
    options?: FindOptions
  ): Promise<SupplierItemWithRelations[]> {
    const client = this.getClient(options?.tx);

    const items = await client.supplierItem.findMany({
      where: {
        isActive: true,
        OR: [
          { needsReview: true },
          { 
            matchConfidence: { lt: confidenceThreshold } 
          },
          {
            matchConfidence: null,
            matchMethod: 'MANUAL',
          },
        ],
      },
      include: {
        globalSupplier: {
          select: { id: true, name: true },
        },
        product: {
          select: { id: true, name: true, gtin: true, brand: true },
        },
      },
      orderBy: [
        { needsReview: 'desc' },
        { matchConfidence: 'asc' },
        { createdAt: 'desc' },
      ],
      skip: offset,
      take: limit,
    });

    return items as SupplierItemWithRelations[];
  }

  /**
   * Count supplier items needing review
   */
  async countNeedingReview(
    confidenceThreshold: number = 0.9,
    options?: FindOptions
  ): Promise<number> {
    const client = this.getClient(options?.tx);

    return client.supplierItem.count({
      where: {
        isActive: true,
        OR: [
          { needsReview: true },
          { matchConfidence: { lt: confidenceThreshold } },
          {
            matchConfidence: null,
            matchMethod: 'MANUAL',
          },
        ],
      },
    });
  }

  /**
   * Update match result for a supplier item
   */
  async updateMatchResult(
    id: string,
    input: UpdateMatchResultInput,
    options?: RepositoryOptions
  ): Promise<SupplierItem> {
    const client = this.getClient(options?.tx);

    const item = await client.supplierItem.update({
      where: { id },
      data: {
        productId: input.productId,
        matchMethod: input.matchMethod,
        matchConfidence: input.matchConfidence,
        needsReview: input.needsReview,
        matchedAt: new Date(),
        matchedBy: input.matchedBy,
      },
    });

    return item as SupplierItem;
  }

  /**
   * Mark supplier item as reviewed (confirm current match)
   */
  async confirmMatch(
    id: string,
    matchedBy: string,
    options?: RepositoryOptions
  ): Promise<SupplierItem> {
    const client = this.getClient(options?.tx);

    const item = await client.supplierItem.update({
      where: { id },
      data: {
        needsReview: false,
        matchedAt: new Date(),
        matchedBy,
      },
    });

    return item as SupplierItem;
  }

  /**
   * Mark supplier item as ignored (deactivate and mark reviewed)
   */
  async markIgnored(
    id: string,
    matchedBy: string,
    options?: RepositoryOptions
  ): Promise<SupplierItem> {
    const client = this.getClient(options?.tx);

    const item = await client.supplierItem.update({
      where: { id },
      data: {
        needsReview: false,
        isActive: false,
        matchedAt: new Date(),
        matchedBy,
      },
    });

    return item as SupplierItem;
  }

  /**
   * Find supplier item by ID with relations
   */
  async findByIdWithRelations(
    id: string,
    options?: FindOptions
  ): Promise<SupplierItemWithRelations | null> {
    const client = this.getClient(options?.tx);

    const item = await client.supplierItem.findUnique({
      where: { id },
      include: {
        globalSupplier: {
          select: { id: true, name: true },
        },
        product: {
          select: { id: true, name: true, gtin: true, brand: true },
        },
      },
    });

    return item as SupplierItemWithRelations | null;
  }
}

// Singleton instance
let supplierItemRepositoryInstance: SupplierItemRepository | null = null;

export function getSupplierItemRepository(
  prisma?: any
): SupplierItemRepository {
  if (!supplierItemRepositoryInstance) {
    supplierItemRepositoryInstance = new SupplierItemRepository(prisma);
  }
  return supplierItemRepositoryInstance;
}
