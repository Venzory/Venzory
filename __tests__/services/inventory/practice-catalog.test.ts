/**
 * Practice Catalog Tests
 * Tests for My Items / practice catalog functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryService } from '@/src/services/inventory/inventory-service';
import { getItemService } from '@/src/services/inventory/item-service';
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

// Mock ItemService to avoid circular dependency issues in tests
vi.mock('@/src/services/inventory/item-service', () => {
  const mockItemService = {
    createItem: vi.fn(),
    updateItem: vi.fn(),
    addItemFromCatalog: vi.fn(),
    attachSupplierToItem: vi.fn(),
    detachSupplierFromItem: vi.fn(),
  };
  return {
    ItemService: class {},
    getItemService: () => mockItemService,
  };
});

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
    
    // Reset the mocked ItemService
    const mockItemService = getItemService() as any;
    mockItemService.createItem.mockReset();
    mockItemService.updateItem.mockReset();
    mockItemService.addItemFromCatalog.mockReset();
    mockItemService.attachSupplierToItem.mockReset();
    mockItemService.detachSupplierFromItem.mockReset();
    
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
      
      const expectedItem = {
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
      };

      // Mock ItemService to return the expected item
      const mockItemService = getItemService() as any;
      mockItemService.addItemFromCatalog.mockResolvedValue(expectedItem);

      const result = await inventoryService.addItemFromCatalog(ctx, {
        productId: product.id,
        practiceSupplierId,
        name: 'Test Item',
        sku: 'TEST-001',
      });

      expect(result.defaultPracticeSupplierId).toBe(practiceSupplierId);
      expect(mockItemService.addItemFromCatalog).toHaveBeenCalledWith(
        ctx,
        expect.objectContaining({
          productId: product.id,
          practiceSupplierId,
          name: 'Test Item',
          sku: 'TEST-001',
        })
      );
    });

    it('should throw error if product not in supplier catalog', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const product = createTestProduct();
      const practiceSupplierId = 'ps-123';

      // Mock ItemService to throw the expected error
      const mockItemService = getItemService() as any;
      mockItemService.addItemFromCatalog.mockRejectedValue(
        new BusinessRuleViolationError('This product is not available from the selected supplier')
      );

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
      const product = createTestProduct();
      const practiceSupplierId = 'ps-123';

      // Mock ItemService to throw the expected error
      const mockItemService = getItemService() as any;
      mockItemService.addItemFromCatalog.mockRejectedValue(
        new BusinessRuleViolationError('An item for this product already exists in your catalog')
      );

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

      // Mock ItemService to throw ForbiddenError
      const mockItemService = getItemService() as any;
      mockItemService.addItemFromCatalog.mockRejectedValue(
        new ForbiddenError('Insufficient permissions')
      );

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

