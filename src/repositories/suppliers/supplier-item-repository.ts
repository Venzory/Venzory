import { Prisma } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';
import { SupplierItem, UpsertSupplierItemInput } from '@/src/domain/models';

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
