/**
 * Practice Catalog Tests
 * Tests for My Items / practice catalog functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryService } from '@/src/services/inventory/inventory-service';
import { InventoryRepository } from '@/src/repositories/inventory';
import { ProductRepository } from '@/src/repositories/products';
import { LocationRepository } from '@/src/repositories/locations';
import { StockCountRepository } from '@/src/repositories/stock-count';
import { UserRepository } from '@/src/repositories/users';
import { AuditService } from '@/src/services/audit/audit-service';
import {
  BusinessRuleViolationError,
  ForbiddenError,
} from '@/src/domain/errors';
import {
  createTestContext,
  createTestPractice,
  createTestProduct,
  createTestItem,
  resetCounters,
} from '@/__tests__/fixtures/inventory-fixtures';

// Mock the withTransaction helper to execute callback immediately without DB
vi.mock('@/src/repositories/base', () => ({
  BaseRepository: class {},
  withTransaction: vi.fn((callback) => callback({})),
}));

describe('Practice Catalog', () => {
  let inventoryService: InventoryService;
  let mockInventoryRepo: any;
  let mockProductRepo: any;
  let mockLocationRepo: any;
  let mockStockCountRepo: any;
  let mockUserRepo: any;
  let mockAuditService: any;

  beforeEach(() => {
    resetCounters();
    
    // Create mock repositories
    mockInventoryRepo = {
      findItemById: vi.fn(),
      findItems: vi.fn(),
      countItems: vi.fn(),
      createItem: vi.fn(),
    };

    mockProductRepo = {
      findProductById: vi.fn(),
      findCatalogByPracticeSupplierProduct: vi.fn(),
    };

    mockLocationRepo = {};
    mockStockCountRepo = {};
    mockUserRepo = {};

    mockAuditService = {
      logItemCreated: vi.fn(),
    };

    // Create service
    inventoryService = new InventoryService(
      mockInventoryRepo as any,
      mockProductRepo as any,
      mockLocationRepo as any,
      mockStockCountRepo as any,
      mockUserRepo as any,
      mockAuditService as any
    );
  });

  describe('findItems with practiceSupplierId filter', () => {
    it('should filter items by practice supplier', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);
      const practiceSupplierId = 'ps-123';

      const mockItems = [
        {
          ...item,
          defaultPracticeSupplierId: practiceSupplierId,
          defaultPracticeSupplier: {
            id: practiceSupplierId,
            customLabel: 'Test Supplier',
            globalSupplier: {
              name: 'Global Supplier Name',
            },
          },
          supplierItems: [
            {
              id: 'si-1',
              practiceSupplierId,
              unitPrice: 10.50,
              currency: 'EUR',
            },
          ],
          inventory: [],
        },
      ];

      mockInventoryRepo.findItems.mockResolvedValue(mockItems);
      mockInventoryRepo.countItems.mockResolvedValue(1);

      const result = await inventoryService.findItems(ctx, {
        practiceSupplierId,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.defaultPracticeSupplierId).toBe(practiceSupplierId);
      expect(result.items[0]?.defaultPracticeSupplier?.customLabel).toBe('Test Supplier');
      expect(result.items[0]?.supplierItems).toHaveLength(1);
      expect(result.items[0]?.supplierItems?.[0]?.practiceSupplierId).toBe(practiceSupplierId);
      expect(mockInventoryRepo.findItems).toHaveBeenCalledWith(
        ctx.practiceId,
        expect.objectContaining({ practiceSupplierId }),
        expect.any(Object)
      );
    });

    it('should return empty array when no items match practice supplier', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      mockInventoryRepo.findItems.mockResolvedValue([]);
      mockInventoryRepo.countItems.mockResolvedValue(0);

      const result = await inventoryService.findItems(ctx, {
        practiceSupplierId: 'non-existent-ps',
      });

      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('addItemFromCatalog', () => {
    it('should create item with defaultPracticeSupplierId set', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const product = createTestProduct();
      const practiceSupplierId = 'ps-123';
      const catalogEntry = {
        id: 'catalog-1',
        practiceSupplierId,
        productId: product.id,
        unitPrice: 15.00,
      };

      mockProductRepo.findProductById.mockResolvedValue(product);
      mockProductRepo.findCatalogByPracticeSupplierProduct.mockResolvedValue(catalogEntry);
      mockInventoryRepo.findItems.mockResolvedValue([]); // No existing items
      mockInventoryRepo.createItem.mockResolvedValue({
        id: 'item-1',
        practiceId: practice.id,
        productId: product.id,
        name: 'Test Item',
        defaultPracticeSupplierId: practiceSupplierId,
      });
      mockInventoryRepo.findItemById.mockResolvedValue({
        id: 'item-1',
        practiceId: practice.id,
        productId: product.id,
        name: 'Test Item',
        defaultPracticeSupplierId: practiceSupplierId,
        defaultPracticeSupplier: {
          id: practiceSupplierId,
          customLabel: null,
          globalSupplier: { name: 'Test Supplier' },
        },
        supplierItems: [],
        inventory: [],
      });

      const result = await inventoryService.addItemFromCatalog(ctx, {
        productId: product.id,
        practiceSupplierId,
        name: 'Test Item',
        sku: 'TEST-001',
      });

      expect(result.defaultPracticeSupplierId).toBe(practiceSupplierId);
      expect(mockInventoryRepo.createItem).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultPracticeSupplierId: practiceSupplierId,
        }),
        expect.any(Object)
      );
      expect(mockAuditService.logItemCreated).toHaveBeenCalled();
    });

    it('should throw error if product not in supplier catalog', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const product = createTestProduct();
      const practiceSupplierId = 'ps-123';

      mockProductRepo.findProductById.mockResolvedValue(product);
      mockProductRepo.findCatalogByPracticeSupplierProduct.mockResolvedValue(null); // Not in catalog

      await expect(
        inventoryService.addItemFromCatalog(ctx, {
          productId: product.id,
          practiceSupplierId,
          name: 'Test Item',
        })
      ).rejects.toThrow(BusinessRuleViolationError);
      
      await expect(
        inventoryService.addItemFromCatalog(ctx, {
          productId: product.id,
          practiceSupplierId,
          name: 'Test Item',
        })
      ).rejects.toThrow('This product is not available from the selected supplier');
    });

    it('should throw error if item already exists for product', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const product = createTestProduct();
      const practiceSupplierId = 'ps-123';
      const existingItem = createTestItem(practice.id, product.id);

      mockProductRepo.findProductById.mockResolvedValue(product);
      mockProductRepo.findCatalogByPracticeSupplierProduct.mockResolvedValue({
        id: 'catalog-1',
        practiceSupplierId,
        productId: product.id,
      });
      mockInventoryRepo.findItems.mockResolvedValue([existingItem]); // Item already exists

      await expect(
        inventoryService.addItemFromCatalog(ctx, {
          productId: product.id,
          practiceSupplierId,
          name: 'Test Item',
        })
      ).rejects.toThrow(BusinessRuleViolationError);
      
      await expect(
        inventoryService.addItemFromCatalog(ctx, {
          productId: product.id,
          practiceSupplierId,
          name: 'Test Item',
        })
      ).rejects.toThrow('An item for this product already exists in your catalog');
    });

    it('should require STAFF role', async () => {
      const ctx = createTestContext({ role: 'VIEWER' });

      await expect(
        inventoryService.addItemFromCatalog(ctx, {
          productId: 'prod-1',
          practiceSupplierId: 'ps-1',
          name: 'Test Item',
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });
});

