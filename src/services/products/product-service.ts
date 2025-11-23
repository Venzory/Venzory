/**
 * Product Service
 * Business logic for product catalog management
 */

import { ProductRepository } from '@/src/repositories/products';
import { InventoryRepository } from '@/src/repositories/inventory';
import { PracticeSupplierRepository } from '@/src/repositories/suppliers';
import { AuditService } from '../audit/audit-service';
import type { RequestContext } from '@/src/lib/context/request-context';
import { requireRole } from '@/src/lib/context/context-builder';
import { isPlatformOwner } from '@/lib/owner-guard';
import { withTransaction } from '@/src/repositories/base';
import {
  Product,
  CreateProductInput,
  UpdateProductInput,
  ProductFilters,
  UpsertSupplierItemInput,
  SupplierItem,
  SupplierItemFilters,
  ItemWithRelations,
  PracticeSupplierWithRelations,
} from '@/src/domain/models';
import {
  ValidationError,
  BusinessRuleViolationError,
  NotFoundError,
  ForbiddenError,
} from '@/src/domain/errors';
import { validateStringLength, validateGtinOrThrow, validatePrice } from '@/src/domain/validators';

interface SupplierOption {
  practiceSupplier: PracticeSupplierWithRelations;
  supplierItem: SupplierItem;
  isDefault: boolean;
}

export class ProductService {
  constructor(
    private productRepository: ProductRepository,
    private inventoryRepository: InventoryRepository,
    private auditService: AuditService,
    private practiceSupplierRepository: PracticeSupplierRepository = new PracticeSupplierRepository()
  ) {}

  /**
   * Find products with filters
   */
  async findProducts(
    ctx: RequestContext,
    filters?: Partial<ProductFilters>
  ): Promise<Product[]> {
    // No tenant scoping for products - they are shared across practices
    return this.productRepository.findProducts(filters);
  }

  /**
   * Get product by ID
   */
  async getProductById(ctx: RequestContext, productId: string): Promise<Product> {
    return this.productRepository.findProductById(productId);
  }

  /**
   * Create new product
   */
  async createProduct(
    ctx: RequestContext,
    input: CreateProductInput
  ): Promise<Product> {
    // Check permissions - Platform Owner ONLY
    if (!isPlatformOwner(ctx.userEmail)) {
      throw new ForbiddenError('Only the platform owner can create products.');
    }
    // requireRole(ctx, 'ADMIN'); // Redundant for owner, but kept if we relax this later. For now strict owner check.

    // Validate input
    validateStringLength(input.name, 'Product name', 1, 255);
    if (input.brand) {
      validateStringLength(input.brand, 'Brand', 1, 128);
    }
    
    // Validate GTIN format if provided (CRITICAL for Magento integration)
    if (input.gtin) {
      validateGtinOrThrow(input.gtin);
    }
    
    // Validate GS1 consistency: GS1 products must have a GTIN
    if (input.isGs1Product && !input.gtin) {
      throw new ValidationError('GS1 products must have a GTIN');
    }

    return withTransaction(async (tx) => {
      // Check for duplicate GTIN
      if (input.gtin) {
        const existing = await this.productRepository.findProductByGtin(
          input.gtin,
          { tx }
        );
        if (existing) {
          throw new BusinessRuleViolationError(
            'A product with this GTIN already exists'
          );
        }
      }

      // Create product
      const product = await this.productRepository.createProduct(input, { tx });

      // Log audit event
      await this.auditService.logProductCreated(
        ctx,
        product.id,
        {
          name: product.name,
          gtin: product.gtin,
          brand: product.brand,
        },
        tx
      );

      return product;
    });
  }

  /**
   * Update existing product
   */
  async updateProduct(
    ctx: RequestContext,
    productId: string,
    input: UpdateProductInput
  ): Promise<Product> {
    // Check permissions - Platform Owner ONLY
    if (!isPlatformOwner(ctx.userEmail)) {
      throw new ForbiddenError('Only the platform owner can update products.');
    }

    // Validate input
    if (input.name !== undefined) {
      validateStringLength(input.name, 'Product name', 1, 255);
    }
    if (input.brand !== undefined && input.brand !== null) {
      validateStringLength(input.brand, 'Brand', 1, 128);
    }
    
    // Validate GTIN format if provided (CRITICAL for Magento integration)
    if (input.gtin !== undefined && input.gtin !== null) {
      validateGtinOrThrow(input.gtin);
    }

    return withTransaction(async (tx) => {
      // Verify product exists
      const existing = await this.productRepository.findProductById(productId, { tx });

      // Validate GS1 consistency
      if (input.isGs1Product !== undefined || input.gtin !== undefined) {
        const newIsGs1 = input.isGs1Product ?? existing.isGs1Product;
        const newGtin = input.gtin ?? existing.gtin;
        
        if (newIsGs1 && !newGtin) {
          throw new ValidationError('GS1 products must have a GTIN');
        }
      }

      // Check for duplicate GTIN if changing GTIN
      if (input.gtin) {
        const duplicate = await this.productRepository.findProductByGtin(
          input.gtin,
          { tx }
        );
        if (duplicate && duplicate.id !== productId) {
          throw new BusinessRuleViolationError(
            'A product with this GTIN already exists'
          );
        }
      }

      // Update product
      const product = await this.productRepository.updateProduct(
        productId,
        input,
        { tx }
      );

      // Log audit event
      await this.auditService.logProductUpdated(ctx, productId, input, tx);

      return product;
    });
  }

  /**
   * Delete product
   */
  async deleteProduct(ctx: RequestContext, productId: string): Promise<void> {
    // Check permissions - Platform Owner ONLY
    if (!isPlatformOwner(ctx.userEmail)) {
      throw new ForbiddenError('Only the platform owner can delete products.');
    }

    return withTransaction(async (tx) => {
      // Verify product exists
      const product = await this.productRepository.findProductById(productId, {
        tx,
      });

      // Check if product has any items
      const itemCount = await this.inventoryRepository.countItemsByProductId(
        productId,
        { tx }
      );

      if (itemCount > 0) {
        throw new BusinessRuleViolationError(
          'Cannot delete product that is used by inventory items'
        );
      }

      // Delete product (this will cascade to supplier catalogs)
      await this.productRepository.deleteProduct(productId, { tx });

      // Log audit event
      await this.auditService.logProductDeleted(
        ctx,
        productId,
        { name: product.name },
        tx
      );
    });
  }

  /**
   * Trigger GS1 lookup for product
   */
  async triggerGs1Lookup(ctx: RequestContext, productId: string): Promise<void> {
    // Check permissions - Platform Owner ONLY
    if (!isPlatformOwner(ctx.userEmail)) {
      throw new ForbiddenError('Only the platform owner can trigger GS1 lookups.');
    }

    return withTransaction(async (tx) => {
      // Verify product exists
      const product = await this.productRepository.findProductById(productId, {
        tx,
      });

      if (!product.gtin) {
        throw new ValidationError('Product must have a GTIN for GS1 lookup');
      }

      // Update verification status to PENDING
      await this.productRepository.updateGs1Verification(
        productId,
        'PENDING',
        null,
        { tx }
      );

      // Log audit event
      await this.auditService.logGs1LookupTriggered(
        ctx,
        productId,
        { gtin: product.gtin },
        tx
      );
    });
  }

  /**
   * Find supplier catalog entry (SupplierItem)
   */
  async findSupplierCatalog(
    ctx: RequestContext,
    globalSupplierId: string,
    productId: string
  ): Promise<SupplierItem | null> {
    return this.productRepository.findSupplierCatalog(globalSupplierId, productId);
  }

  /**
   * Upsert supplier catalog entry (SupplierItem)
   */
  async upsertSupplierCatalog(
    ctx: RequestContext,
    input: UpsertSupplierItemInput
  ): Promise<SupplierItem> {
    // Check permissions
    if (!isPlatformOwner(ctx.userEmail)) {
      requireRole(ctx, 'ADMIN');
    }
    
    // Validate price if provided
    if (input.unitPrice !== undefined && input.unitPrice !== null) {
      validatePrice(Number(input.unitPrice));
    }
    
    // Validate minOrderQty if provided
    if (input.minOrderQty !== undefined && input.minOrderQty !== null) {
      if (input.minOrderQty <= 0) {
        throw new ValidationError('Minimum order quantity must be positive');
      }
    }

    return withTransaction(async (tx) => {
      // Verify product exists
      await this.productRepository.findProductById(input.productId, { tx });

      // Upsert catalog entry
      const catalog = await this.productRepository.upsertSupplierItem(
        input,
        { tx }
      );

      // Log audit event
      await this.auditService.logSupplierCatalogUpdated(
        ctx,
        catalog.globalSupplierId,
        catalog.productId,
        {
          supplierSku: catalog.supplierSku,
          unitPrice: catalog.unitPrice,
          isActive: catalog.isActive,
        },
        tx
      );

      return catalog;
    });
  }

  /**
   * Find products available to a practice (via their PracticeSuppliers)
   * Phase 2: Catalog browsing with pagination and sorting
   */
  async findProductsForPractice(
    ctx: RequestContext,
    filters?: Partial<ProductFilters>,
    options?: {
      page?: number;
      limit?: number;
      sortBy?: 'name' | 'brand' | 'createdAt';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ products: Product[]; totalCount: number }> {
    // Add practice filter to only show products from linked suppliers
    const practiceFilters = {
      ...filters,
      practiceId: ctx.practiceId,
    };

    // Map sortBy to Prisma orderBy
    let orderBy: any = { name: 'asc' }; // default
    if (options?.sortBy) {
      const direction = options.sortOrder ?? 'asc';
      switch (options.sortBy) {
        case 'name':
          orderBy = { name: direction };
          break;
        case 'brand':
          orderBy = { brand: direction };
          break;
        case 'createdAt':
          orderBy = { createdAt: direction };
          break;
        default:
          orderBy = { name: 'asc' };
      }
    }

    // Fetch products with pagination and sorting
    const products = await this.productRepository.findProducts(practiceFilters, {
      pagination: {
        page: options?.page ?? 1,
        limit: options?.limit ?? 50,
      },
      orderBy,
    });

    // Get total count for pagination UI
    const totalCount = await this.productRepository.countProducts(practiceFilters);

    return { products, totalCount };
  }

  /**
   * Get supplier offers for a product (filtered by practice)
   * Phase 2: Returns all SupplierItem entries from practice's linked suppliers
   */
  async getSupplierOffersForProduct(
    ctx: RequestContext,
    productId: string
  ): Promise<SupplierItem[]> {
    // Verify product exists
    await this.productRepository.findProductById(productId);

    // Get all catalog entries from practice's suppliers
    return this.productRepository.findCatalogsByProductForPractice(
      productId,
      ctx.practiceId
    );
  }

  /**
   * Get supplier offers for multiple products (filtered by practice)
   * Batch version to avoid N+1 queries
   * Phase 2: Returns all SupplierItem entries grouped by productId
   */
  async getSupplierOffersForProducts(
    ctx: RequestContext,
    productIds: string[]
  ): Promise<Map<string, SupplierItem[]>> {
    // Return empty map if no product IDs provided
    if (!productIds || productIds.length === 0) {
      return new Map();
    }

    // Get all catalog entries from practice's suppliers in one query
    const allCatalogs = await this.productRepository.findCatalogsByProductsForPractice(
      productIds,
      ctx.practiceId
    );

    // Group catalogs by productId for O(1) lookup
    const catalogsByProductId = new Map<string, SupplierItem[]>();
    
    for (const catalog of allCatalogs) {
      const productId = catalog.productId;
      if (!catalogsByProductId.has(productId)) {
        catalogsByProductId.set(productId, []);
      }
      catalogsByProductId.get(productId)!.push(catalog);
    }

    return catalogsByProductId;
  }

  /**
   * Find catalog entries for a practice supplier
   * Phase 2: Get all products offered by a specific supplier
   */
  async findCatalogForPracticeSupplier(
    ctx: RequestContext,
    practiceSupplierId: string,
    activeOnly: boolean = true
  ): Promise<SupplierItem[]> {
    // Note: We don't verify the supplier belongs to the practice here
    // That check should be done at the controller/action layer
    return this.productRepository.findCatalogsByPracticeSupplier(
      practiceSupplierId,
      activeOnly
    );
  }

  /**
   * Owner view: list SupplierItems with filters/pagination
   */
  async findSupplierItemsForOwner(
    ctx: RequestContext,
    filters?: SupplierItemFilters,
    options?: {
      page?: number;
      limit?: number;
      sortBy?: 'supplier' | 'product' | 'unitPrice' | 'updatedAt';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ items: SupplierItem[]; totalCount: number }> {
    if (!isPlatformOwner(ctx.userEmail)) {
      throw new ForbiddenError('Only the platform owner can view the global supplier catalog.');
    }

    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const orderBy = this.buildSupplierItemOrderBy(options?.sortBy, options?.sortOrder);

    const [items, totalCount] = await Promise.all([
      this.productRepository.findSupplierItems(filters, {
        pagination: { page, limit },
        orderBy,
      }),
      this.productRepository.countSupplierItems(filters),
    ]);

    return { items, totalCount };
  }

  /**
   * Practice view: get supplier options for a specific item/product
   */
  async getSupplierOptionsForItem(
    ctx: RequestContext,
    itemId: string
  ): Promise<{ item: ItemWithRelations; suppliers: SupplierOption[] }> {
    // Ensure user belongs to practice (throws if item not found for practice)
    const item = await this.inventoryRepository.findItemById(itemId, ctx.practiceId);

    const [practiceSuppliers, supplierItems] = await Promise.all([
      this.practiceSupplierRepository.findPracticeSuppliers(ctx.practiceId, {
        includeBlocked: false,
      }),
      this.productRepository.findSupplierItemsByProductId(item.productId, true, {
        include: {
          globalSupplier: true,
          product: true,
        },
      }),
    ]);

    const practiceSupplierByGlobalId = new Map<string, PracticeSupplierWithRelations>();
    for (const practiceSupplier of practiceSuppliers) {
      practiceSupplierByGlobalId.set(practiceSupplier.globalSupplierId, practiceSupplier);
    }

    const suppliers: SupplierOption[] = supplierItems
      .filter((supplierItem) => practiceSupplierByGlobalId.has(supplierItem.globalSupplierId))
      .map((supplierItem) => {
        const practiceSupplier = practiceSupplierByGlobalId.get(supplierItem.globalSupplierId)!;
        return {
          practiceSupplier,
          supplierItem,
          isDefault: practiceSupplier.id === item.defaultPracticeSupplierId,
        };
      });

    return { item, suppliers };
  }

  private buildSupplierItemOrderBy(
    sortBy?: 'supplier' | 'product' | 'unitPrice' | 'updatedAt',
    sortOrder: 'asc' | 'desc' = 'asc'
  ) {
    switch (sortBy) {
      case 'supplier':
        return { globalSupplier: { name: sortOrder } };
      case 'product':
        return { product: { name: sortOrder } };
      case 'unitPrice':
        return { unitPrice: sortOrder };
      case 'updatedAt':
        return { updatedAt: sortOrder };
      default:
        return [
          { globalSupplier: { name: 'asc' } },
          { product: { name: 'asc' } },
        ];
    }
  }
}

// Singleton instance
let productServiceInstance: ProductService | null = null;

export function getProductService(): ProductService {
  if (!productServiceInstance) {
    const { getAuditService } = require('../audit/audit-service');
    productServiceInstance = new ProductService(
      new ProductRepository(),
      new InventoryRepository(),
      getAuditService()
    );
  }
  return productServiceInstance;
}

