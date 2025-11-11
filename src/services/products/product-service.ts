/**
 * Product Service
 * Business logic for product catalog management
 */

import { ProductRepository } from '@/src/repositories/products';
import { InventoryRepository } from '@/src/repositories/inventory';
import { AuditService } from '../audit/audit-service';
import type { RequestContext } from '@/src/lib/context/request-context';
import { requireRole } from '@/src/lib/context/context-builder';
import { withTransaction } from '@/src/repositories/base';
import {
  Product,
  CreateProductInput,
  UpdateProductInput,
  ProductFilters,
  UpsertSupplierCatalogInput,
  SupplierCatalog,
} from '@/src/domain/models';
import {
  ValidationError,
  BusinessRuleViolationError,
  NotFoundError,
} from '@/src/domain/errors';
import { validateStringLength } from '@/src/domain/validators';

export class ProductService {
  constructor(
    private productRepository: ProductRepository,
    private inventoryRepository: InventoryRepository,
    private auditService: AuditService
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
    // Check permissions
    requireRole(ctx, 'ADMIN');

    // Validate input
    validateStringLength(input.name, 'Product name', 1, 255);
    if (input.brand) {
      validateStringLength(input.brand, 'Brand', 1, 128);
    }
    if (input.gtin) {
      validateStringLength(input.gtin, 'GTIN', 1, 14);
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
    // Check permissions
    requireRole(ctx, 'ADMIN');

    // Validate input
    if (input.name !== undefined) {
      validateStringLength(input.name, 'Product name', 1, 255);
    }
    if (input.brand !== undefined && input.brand !== null) {
      validateStringLength(input.brand, 'Brand', 1, 128);
    }
    if (input.gtin !== undefined && input.gtin !== null) {
      validateStringLength(input.gtin, 'GTIN', 1, 14);
    }

    return withTransaction(async (tx) => {
      // Verify product exists
      await this.productRepository.findProductById(productId, { tx });

      // Check for duplicate GTIN if changing GTIN
      if (input.gtin) {
        const existing = await this.productRepository.findProductByGtin(
          input.gtin,
          { tx }
        );
        if (existing && existing.id !== productId) {
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
    // Check permissions
    requireRole(ctx, 'ADMIN');

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
    // Check permissions
    requireRole(ctx, 'ADMIN');

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
   * Find supplier catalog entry
   */
  async findSupplierCatalog(
    ctx: RequestContext,
    supplierId: string,
    productId: string
  ): Promise<SupplierCatalog | null> {
    return this.productRepository.findSupplierCatalog(supplierId, productId);
  }

  /**
   * Upsert supplier catalog entry
   */
  async upsertSupplierCatalog(
    ctx: RequestContext,
    input: UpsertSupplierCatalogInput
  ): Promise<SupplierCatalog> {
    // Check permissions
    requireRole(ctx, 'ADMIN');

    return withTransaction(async (tx) => {
      // Verify product exists
      await this.productRepository.findProductById(input.productId, { tx });

      // Upsert catalog entry
      const catalog = await this.productRepository.upsertSupplierCatalog(
        input,
        { tx }
      );

      // Log audit event
      await this.auditService.logSupplierCatalogUpdated(
        ctx,
        catalog.supplierId,
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
   * Phase 2: Catalog browsing
   */
  async findProductsForPractice(
    ctx: RequestContext,
    filters?: Partial<ProductFilters>
  ): Promise<Product[]> {
    // Add practice filter to only show products from linked suppliers
    const practiceFilters = {
      ...filters,
      practiceId: ctx.practiceId,
    };

    return this.productRepository.findProducts(practiceFilters);
  }

  /**
   * Get supplier offers for a product (filtered by practice)
   * Phase 2: Returns all SupplierCatalog entries from practice's linked suppliers
   */
  async getSupplierOffersForProduct(
    ctx: RequestContext,
    productId: string
  ): Promise<SupplierCatalog[]> {
    // Verify product exists
    await this.productRepository.findProductById(productId);

    // Get all catalog entries from practice's suppliers
    return this.productRepository.findCatalogsByProductForPractice(
      productId,
      ctx.practiceId
    );
  }

  /**
   * Find catalog entries for a practice supplier
   * Phase 2: Get all products offered by a specific supplier
   */
  async findCatalogForPracticeSupplier(
    ctx: RequestContext,
    practiceSupplierId: string,
    activeOnly: boolean = true
  ): Promise<SupplierCatalog[]> {
    // Note: We don't verify the supplier belongs to the practice here
    // That check should be done at the controller/action layer
    return this.productRepository.findCatalogsByPracticeSupplier(
      practiceSupplierId,
      activeOnly
    );
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

