/**
 * Product Repository
 * Handles all data access for product catalog entities
 */

import { Prisma } from '@prisma/client';
import { BaseRepository, type FindOptions, type RepositoryOptions } from '../base';
import {
  Product,
  SupplierItem,
  CreateProductInput,
  UpdateProductInput,
  UpsertSupplierItemInput,
  ProductFilters,
  ProductSyncData,
  CatalogSyncData,
  SupplierItemFilters,
} from '@/src/domain/models';
import { NotFoundError } from '@/src/domain/errors';

export class ProductRepository extends BaseRepository {
  /**
   * Find products with optional filters
   */
  async findProducts(
    filters?: Partial<ProductFilters>,
    options?: FindOptions
  ): Promise<Product[]> {
    const client = this.getClient(options?.tx);

    const where: Prisma.ProductWhereInput = {};

    // Search by name, brand, or GTIN
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { gtin: { contains: filters.search } },
      ];
    }

    if (filters?.isGs1Product !== undefined) {
      where.isGs1Product = filters.isGs1Product;
    }

    if (filters?.gs1VerificationStatus) {
      where.gs1VerificationStatus = filters.gs1VerificationStatus;
    }

    // Filter by supplier (products linked via SupplierItem)
    if (filters?.globalSupplierId) {
      where.supplierItems = {
        some: {
          globalSupplierId: filters.globalSupplierId,
          isActive: true,
        },
      };
    }

    // Filter by practice
    if (filters?.practiceId) {
       where.supplierItems = {
         some: {
           globalSupplier: {
             practiceLinks: {
               some: {
                 practiceId: filters.practiceId,
                 isBlocked: false
               }
             }
           },
           isActive: true
         }
       }
    }

    const products = await client.product.findMany({
      where,
      orderBy: options?.orderBy ?? { name: 'asc' },
      ...this.buildPagination(options?.pagination),
    });

    return products as Product[];
  }

  /**
   * Count products with optional filters
   * Uses same filter logic as findProducts for consistency
   */
  async countProducts(
    filters?: Partial<ProductFilters>,
    options?: FindOptions
  ): Promise<number> {
    const client = this.getClient(options?.tx);

    const where: Prisma.ProductWhereInput = {};

    // Search by name, brand, or GTIN
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { gtin: { contains: filters.search } },
      ];
    }

    if (filters?.isGs1Product !== undefined) {
      where.isGs1Product = filters.isGs1Product;
    }

    if (filters?.gs1VerificationStatus) {
      where.gs1VerificationStatus = filters.gs1VerificationStatus;
    }

    // Filter by supplier (products linked via SupplierItem)
    if (filters?.globalSupplierId) {
      where.supplierItems = {
        some: {
          globalSupplierId: filters.globalSupplierId,
          isActive: true,
        },
      };
    }

    // Filter by practice
    if (filters?.practiceId) {
       where.supplierItems = {
         some: {
           globalSupplier: {
             practiceLinks: {
               some: {
                 practiceId: filters.practiceId,
                 isBlocked: false
               }
             }
           },
           isActive: true
         }
       }
    }

    return client.product.count({ where });
  }

  /**
   * Find product by ID
   */
  async findProductById(
    productId: string,
    options?: FindOptions
  ): Promise<Product> {
    const client = this.getClient(options?.tx);

    const product = await client.product.findUnique({
      where: { id: productId },
      include: options?.include ?? undefined,
    });

    return this.ensureExists(Promise.resolve(product as any), 'Product', productId);
  }

  /**
   * Find product by GTIN
   */
  async findProductByGtin(
    gtin: string,
    options?: FindOptions
  ): Promise<Product | null> {
    const client = this.getClient(options?.tx);

    const product = await client.product.findUnique({
      where: { gtin },
      include: options?.include ?? undefined,
    });

    return product as Product | null;
  }

  /**
   * Create new product
   */
  async createProduct(
    input: CreateProductInput,
    options?: RepositoryOptions
  ): Promise<Product> {
    const client = this.getClient(options?.tx);

    const product = await client.product.create({
      data: {
        gtin: input.gtin ?? null,
        brand: input.brand ?? null,
        name: input.name,
        description: input.description ?? null,
        isGs1Product: input.isGs1Product ?? false,
        gs1VerificationStatus: 'UNVERIFIED',
      },
    });

    return product as Product;
  }

  /**
   * Update product
   */
  async updateProduct(
    productId: string,
    input: UpdateProductInput,
    options?: RepositoryOptions
  ): Promise<Product> {
    const client = this.getClient(options?.tx);

    const product = await client.product.update({
      where: { id: productId },
      data: {
        gtin: input.gtin,
        brand: input.brand,
        name: input.name,
        description: input.description,
        gs1VerificationStatus: input.gs1VerificationStatus,
        gs1VerifiedAt: input.gs1VerifiedAt,
        gs1Data: input.gs1Data as Prisma.InputJsonValue,
      },
    });

    return product as Product;
  }

  /**
   * Find or create product (for imports/sync)
   */
  async findOrCreateProduct(
    data: ProductSyncData,
    options?: RepositoryOptions
  ): Promise<Product> {
    const client = this.getClient(options?.tx);

    // If GTIN provided, try to find existing
    if (data.gtin) {
      const existing = await this.findProductByGtin(data.gtin, { tx: options?.tx });
      if (existing) {
        return existing;
      }
    }

    // Create new product
    return this.createProduct(
      {
        gtin: data.gtin ?? null,
        brand: data.brand ?? null,
        name: data.name,
        description: data.description ?? null,
        isGs1Product: !!data.gtin,
      },
      options
    );
  }

  /**
   * Find supplier catalog entry (SupplierItem)
   */
  async findSupplierCatalog(
    globalSupplierId: string,
    productId: string,
    options?: FindOptions
  ): Promise<SupplierItem | null> {
    const client = this.getClient(options?.tx);

    const catalog = await client.supplierItem.findUnique({
      where: {
        globalSupplierId_productId: { globalSupplierId, productId },
      },
      include: options?.include ?? undefined,
    });

    return catalog as SupplierItem | null;
  }

  /**
   * Find all catalog entries for a supplier
   */
  async findSupplierCatalogs(
    globalSupplierId: string,
    activeOnly: boolean = true,
    options?: FindOptions
  ): Promise<SupplierItem[]> {
    const client = this.getClient(options?.tx);

    const where: Prisma.SupplierItemWhereInput = { globalSupplierId };
    if (activeOnly) {
      where.isActive = true;
    }

    const catalogs = await client.supplierItem.findMany({
      where,
      include: {
        product: true,
      },
      orderBy: { product: { name: 'asc' } },
    });

    return catalogs as SupplierItem[];
  }

  /**
   * Find supplier items with filters (owner/global view)
   */
  async findSupplierItems(
    filters?: SupplierItemFilters,
    options?: FindOptions
  ): Promise<SupplierItem[]> {
    const client = this.getClient(options?.tx);

    const where = this.buildSupplierItemWhere(filters);

    const supplierItems = await client.supplierItem.findMany({
      where,
      include:
        options?.include ??
        ({
          product: true,
          globalSupplier: true,
        } as Prisma.SupplierItemInclude),
      orderBy:
        options?.orderBy ??
        [
          { globalSupplier: { name: 'asc' } },
          { product: { name: 'asc' } },
        ],
      ...this.buildPagination(options?.pagination),
    });

    return supplierItems as SupplierItem[];
  }

  /**
   * Count supplier items with filters
   */
  async countSupplierItems(filters?: SupplierItemFilters, options?: FindOptions): Promise<number> {
    const client = this.getClient(options?.tx);
    const where = this.buildSupplierItemWhere(filters);
    return client.supplierItem.count({ where });
  }

  /**
   * Find supplier items for a specific product
   */
  async findSupplierItemsByProductId(
    productId: string,
    activeOnly: boolean = true,
    options?: FindOptions
  ): Promise<SupplierItem[]> {
    const client = this.getClient(options?.tx);

    const supplierItems = await client.supplierItem.findMany({
      where: {
        productId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      include:
        options?.include ??
        ({
          globalSupplier: true,
          product: true,
        } as Prisma.SupplierItemInclude),
      orderBy:
        options?.orderBy ??
        [
          { isActive: 'desc' },
          { unitPrice: 'asc' },
          { globalSupplier: { name: 'asc' } },
        ],
    });

    return supplierItems as SupplierItem[];
  }

  /**
   * Upsert supplier catalog entry (SupplierItem)
   */
  async upsertSupplierCatalog(
    input: UpsertSupplierItemInput,
    options?: RepositoryOptions
  ): Promise<SupplierItem> {
    const client = this.getClient(options?.tx);

    const catalog = await client.supplierItem.upsert({
      where: {
        globalSupplierId_productId: {
          globalSupplierId: input.globalSupplierId,
          productId: input.productId,
        },
      },
      create: {
        globalSupplierId: input.globalSupplierId,
        productId: input.productId,
        supplierSku: input.supplierSku ?? null,
        unitPrice: input.unitPrice ?? null,
        currency: input.currency ?? 'EUR',
        minOrderQty: input.minOrderQty ?? 1,
        integrationType: input.integrationType ?? 'MANUAL',
        integrationConfig: input.integrationConfig as Prisma.InputJsonValue,
        isActive: input.isActive ?? true,
        lastSyncAt: new Date(),
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

    return catalog as SupplierItem;
  }

  /**
   * Sync supplier feed (find/create product + upsert catalog)
   */
  async syncSupplierFeed(
    globalSupplierId: string,
    productData: ProductSyncData,
    catalogData: CatalogSyncData,
    options?: RepositoryOptions
  ): Promise<{ product: Product; catalog: SupplierItem }> {
    const client = this.getClient(options?.tx);

    // Find or create product
    const product = await this.findOrCreateProduct(productData, { tx: options?.tx });

    // Upsert catalog entry
    const catalog = await this.upsertSupplierCatalog(
      {
        globalSupplierId,
        productId: product.id,
        supplierSku: catalogData.supplierSku ?? null,
        unitPrice: catalogData.unitPrice ?? null,
        currency: catalogData.currency ?? 'EUR',
        minOrderQty: catalogData.minOrderQty ?? 1,
        integrationType: catalogData.integrationType,
        integrationConfig: catalogData.integrationConfig ?? null,
        isActive: catalogData.isActive ?? true,
      },
      { tx: options?.tx }
    );

    return { product, catalog };
  }

  /**
   * Batch sync multiple supplier feeds
   */
  async batchSyncSupplierFeeds(
    globalSupplierId: string,
    feeds: Array<{ product: ProductSyncData; catalog: CatalogSyncData }>,
    options?: RepositoryOptions
  ): Promise<{ productsProcessed: number; catalogsUpdated: number; errors: string[] }> {
    let productsProcessed = 0;
    let catalogsUpdated = 0;
    const errors: string[] = [];

    for (const feed of feeds) {
      try {
        await this.syncSupplierFeed(globalSupplierId, feed.product, feed.catalog, options);
        productsProcessed++;
        catalogsUpdated++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to sync ${feed.product.name}: ${errorMessage}`);
      }
    }

    return { productsProcessed, catalogsUpdated, errors };
  }

  /**
   * Update GS1 verification status
   */
  async updateGs1Verification(
    productId: string,
    status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED',
    gs1Data?: Record<string, unknown> | null,
    options?: RepositoryOptions
  ): Promise<Product> {
    const client = this.getClient(options?.tx);

    const product = await client.product.update({
      where: { id: productId },
      data: {
        gs1VerificationStatus: status,
        gs1VerifiedAt: status === 'VERIFIED' ? new Date() : null,
        gs1Data: gs1Data as Prisma.InputJsonValue,
      },
    });

    return product as Product;
  }

  /**
   * Delete product
   */
  async deleteProduct(
    productId: string,
    options?: RepositoryOptions
  ): Promise<void> {
    const client = this.getClient(options?.tx);

    await client.product.delete({
      where: { id: productId },
    });
  }

  /**
   * Find all catalog entries for a practice supplier (Phase 2)
   */
  async findCatalogsByPracticeSupplier(
    practiceSupplierId: string,
    activeOnly: boolean = true,
    options?: FindOptions
  ): Promise<SupplierItem[]> {
    const client = this.getClient(options?.tx);
    
    // First get the GlobalSupplierId from the PracticeSupplier
    const practiceSupplier = await client.practiceSupplier.findUnique({
      where: { id: practiceSupplierId },
      select: { globalSupplierId: true }
    });
    
    if (!practiceSupplier) return [];

    const where: Prisma.SupplierItemWhereInput = { 
      globalSupplierId: practiceSupplier.globalSupplierId 
    };
    
    if (activeOnly) {
      where.isActive = true;
    }

    const catalogs = await client.supplierItem.findMany({
      where,
      include: {
        product: true,
        globalSupplier: true
      },
      orderBy: { product: { name: 'asc' } },
    });

    return catalogs as SupplierItem[];
  }

  /**
   * Find catalog entries for a product, filtered by practice (Phase 2)
   */
  async findCatalogsByProductForPractice(
    productId: string,
    practiceId: string,
    options?: FindOptions
  ): Promise<SupplierItem[]> {
    const client = this.getClient(options?.tx);

    const catalogs = await client.supplierItem.findMany({
      where: {
        productId,
        globalSupplier: {
          practiceLinks: {
             some: {
               practiceId,
               isBlocked: false
             }
          }
        },
        isActive: true,
      },
      include: {
        product: true,
        globalSupplier: {
           include: {
             practiceLinks: {
               where: { practiceId }
             }
           }
        }
      },
      orderBy: { unitPrice: 'asc' }, 
    });

    return catalogs as SupplierItem[];
  }

  /**
   * Find catalog entries for multiple products, filtered by practice (Phase 2)
   */
  async findCatalogsByProductsForPractice(
    productIds: string[],
    practiceId: string,
    options?: FindOptions
  ): Promise<SupplierItem[]> {
    const client = this.getClient(options?.tx);

    if (!productIds || productIds.length === 0) {
      return [];
    }

    const catalogs = await client.supplierItem.findMany({
      where: {
        productId: { in: productIds },
        globalSupplier: {
          practiceLinks: {
             some: {
               practiceId,
               isBlocked: false
             }
          }
        },
        isActive: true,
      },
      include: {
        product: true,
        globalSupplier: {
           include: {
             practiceLinks: {
               where: { practiceId }
             }
           }
        }
      },
      orderBy: { unitPrice: 'asc' }, 
    });

    return catalogs as SupplierItem[];
  }

  /**
   * Find catalog entry by practice supplier and product (Phase 2)
   */
  async findCatalogByPracticeSupplierProduct(
    practiceSupplierId: string,
    productId: string,
    options?: FindOptions
  ): Promise<SupplierItem | null> {
    const client = this.getClient(options?.tx);
    
    // Get Global Supplier ID first
    const practiceSupplier = await client.practiceSupplier.findUnique({
      where: { id: practiceSupplierId },
      select: { globalSupplierId: true }
    });
    
    if (!practiceSupplier) return null;

    const catalog = await client.supplierItem.findUnique({
      where: {
        globalSupplierId_productId: {
          globalSupplierId: practiceSupplier.globalSupplierId,
          productId
        }
      },
      include: options?.include ?? undefined,
    });

    return catalog as SupplierItem | null;
  }

  /**
   * Find products that need GS1 refresh (expired or failed verification)
   */
  async findProductsForGs1Refresh(
    limit: number = 100,
    options?: FindOptions
  ): Promise<Product[]> {
    const client = this.getClient(options?.tx);

    const products = await client.product.findMany({
      where: {
        gtin: { not: null },
        isGs1Product: true,
        gs1VerificationStatus: {
          in: ['EXPIRED', 'FAILED'],
        },
      },
      take: limit,
      select: { id: true, gtin: true, name: true, gs1VerificationStatus: true },
    });

    return products as Product[];
  }

  /**
   * Build reusable where clause for supplier item queries
   */
  private buildSupplierItemWhere(
    filters?: SupplierItemFilters
  ): Prisma.SupplierItemWhereInput {
    const where: Prisma.SupplierItemWhereInput = {};

    if (!filters) {
      return where;
    }

    if (filters.globalSupplierId) {
      where.globalSupplierId = filters.globalSupplierId;
    }

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const andClauses: Prisma.SupplierItemWhereInput[] = [];

    if (filters.practiceId) {
      andClauses.push({
        globalSupplier: {
          practiceLinks: {
            some: {
              practiceId: filters.practiceId,
              isBlocked: false,
            },
          },
        },
      });
    }

    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      andClauses.push({
        OR: [
          { supplierSku: { contains: term, mode: 'insensitive' } },
          { product: { name: { contains: term, mode: 'insensitive' } } },
          { product: { brand: { contains: term, mode: 'insensitive' } } },
          { product: { gtin: { contains: term } } },
          { globalSupplier: { name: { contains: term, mode: 'insensitive' } } },
        ],
      });
    }

    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    return where;
  }
}

