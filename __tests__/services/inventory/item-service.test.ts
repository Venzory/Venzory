/**
 * Item Service Tests
 * Tests for ItemService create/update/attach/detach flows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ItemService } from '@/src/services/inventory/item-service';
import { InventoryRepository } from '@/src/repositories/inventory';
import { ProductRepository } from '@/src/repositories/products';
import { PracticeSupplierRepository } from '@/src/repositories/suppliers';
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

describe('ItemService', () => {
  let itemService: ItemService;
  let mockInventoryRepo: any;
  let mockProductRepo: any;
  let mockPracticeSupplierRepo: any;
  let mockAuditService: any;

  beforeEach(() => {
    resetCounters();
    
    // Create mock repositories
    mockInventoryRepo = {
      findItemById: vi.fn(),
      findItems: vi.fn(),
      createItem: vi.fn(),
      updateItem: vi.fn(),
      upsertSupplierItem: vi.fn(),
    };

    mockProductRepo = {
      findProductById: vi.fn(),
      findCatalogByPracticeSupplierProduct: vi.fn(),
    };

    mockPracticeSupplierRepo = {
      findPracticeSupplierById: vi.fn(),
    };

    mockAuditService = {
      logItemCreated: vi.fn(),
      logItemUpdated: vi.fn(),
    };

    // Create service
    itemService = new ItemService(
      mockInventoryRepo as any,
      mockProductRepo as any,
      mockPracticeSupplierRepo as any,
      mockAuditService as any
    );
  });

  describe('createItem', () => {
    it('should create item without any supplier', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const product = createTestProduct();

      mockProductRepo.findProductById.mockResolvedValue(product);
      mockInventoryRepo.createItem.mockResolvedValue({
        id: 'item-1',
        practiceId: practice.id,
        productId: product.id,
        name: 'Test Item',
        sku: null,
        description: null,
        unit: null,
        defaultSupplierId: null,
        defaultPracticeSupplierId: null,
      });
      mockInventoryRepo.findItemById.mockResolvedValue({
        id: 'item-1',
        practiceId: practice.id,
        productId: product.id,
        name: 'Test Item',
        defaultPracticeSupplierId: null,
        supplierItems: [],
        inventory: [],
      });

      const result = await itemService.createItem(ctx, {
        productId: product.id,
        name: 'Test Item',
      });

      expect(result.id).toBe('item-1');
      expect(result.defaultPracticeSupplierId).toBeNull();
      expect(mockInventoryRepo.upsertSupplierItem).not.toHaveBeenCalled();
      expect(mockAuditService.logItemCreated).toHaveBeenCalled();
    });

    it('should create item with PracticeSupplier and SupplierItem', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const product = createTestProduct();
      const practiceSupplierId = 'ps-123';
      const supplierId = 'supplier-456';

      mockProductRepo.findProductById.mockResolvedValue(product);
      mockPracticeSupplierRepo.findPracticeSupplierById.mockResolvedValue({
        id: practiceSupplierId,
        practiceId: practice.id,
        globalSupplierId: 'global-1',
        migratedFromSupplierId: supplierId,
        isBlocked: false,
      });
      mockInventoryRepo.createItem.mockResolvedValue({
        id: 'item-1',
        practiceId: practice.id,
        productId: product.id,
        name: 'Test Item',
        defaultPracticeSupplierId: practiceSupplierId,
      });
      mockInventoryRepo.upsertSupplierItem.mockResolvedValue({
        id: 'si-1',
        supplierId,
        itemId: 'item-1',
        practiceSupplierId,
        unitPrice: 10.50,
        currency: 'EUR',
        minOrderQty: 1,
      });
      mockInventoryRepo.findItemById.mockResolvedValue({
        id: 'item-1',
        practiceId: practice.id,
        productId: product.id,
        name: 'Test Item',
        defaultPracticeSupplierId: practiceSupplierId,
        supplierItems: [{
          id: 'si-1',
          practiceSupplierId,
          unitPrice: 10.50,
        }],
        inventory: [],
      });

      const result = await itemService.createItem(ctx, {
        productId: product.id,
        name: 'Test Item',
        defaultPracticeSupplierId: practiceSupplierId,
        unitPrice: 10.50,
        supplierSku: 'SKU-001',
      });

      expect(result.id).toBe('item-1');
      expect(result.defaultPracticeSupplierId).toBe(practiceSupplierId);
      expect(mockInventoryRepo.upsertSupplierItem).toHaveBeenCalledWith(
        supplierId,
        'item-1',
        expect.objectContaining({
          supplierSku: 'SKU-001',
          unitPrice: 10.50,
          currency: 'EUR',
          minOrderQty: 1,
          practiceSupplierId,
        }),
        expect.any(Object)
      );
      expect(mockAuditService.logItemCreated).toHaveBeenCalled();
    });

    it('should reject blocked supplier', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const product = createTestProduct();
      const practiceSupplierId = 'ps-123';

      mockProductRepo.findProductById.mockResolvedValue(product);
      mockPracticeSupplierRepo.findPracticeSupplierById.mockResolvedValue({
        id: practiceSupplierId,
        isBlocked: true,
      });

      await expect(
        itemService.createItem(ctx, {
          productId: product.id,
          name: 'Test Item',
          defaultPracticeSupplierId: practiceSupplierId,
        })
      ).rejects.toThrow(BusinessRuleViolationError);
    });

    it('should require STAFF role', async () => {
      const ctx = createTestContext({ role: 'VIEWER' });

      await expect(
        itemService.createItem(ctx, {
          productId: 'prod-1',
          name: 'Test Item',
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('updateItem', () => {
    it('should update item details without changing supplier', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const item = createTestItem(practice.id, 'prod-1');

      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockInventoryRepo.updateItem.mockResolvedValue({
        ...item,
        name: 'Updated Name',
        sku: 'NEW-SKU',
      });
      mockInventoryRepo.findItemById.mockResolvedValueOnce(item).mockResolvedValueOnce({
        ...item,
        name: 'Updated Name',
        sku: 'NEW-SKU',
      });

      const result = await itemService.updateItem(ctx, item.id, {
        name: 'Updated Name',
        sku: 'NEW-SKU',
      });

      expect(result.name).toBe('Updated Name');
      expect(result.sku).toBe('NEW-SKU');
      expect(mockInventoryRepo.upsertSupplierItem).not.toHaveBeenCalled();
      expect(mockAuditService.logItemUpdated).toHaveBeenCalled();
    });

    it('should update item and change supplier', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const item = createTestItem(practice.id, 'prod-1');
      const newPracticeSupplierId = 'ps-new';
      const newSupplierId = 'supplier-new';

      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockPracticeSupplierRepo.findPracticeSupplierById.mockResolvedValue({
        id: newPracticeSupplierId,
        practiceId: practice.id,
        migratedFromSupplierId: newSupplierId,
        isBlocked: false,
      });
      mockInventoryRepo.upsertSupplierItem.mockResolvedValue({
        id: 'si-new',
        supplierId: newSupplierId,
        itemId: item.id,
        practiceSupplierId: newPracticeSupplierId,
      });
      mockInventoryRepo.updateItem.mockResolvedValue({
        ...item,
        defaultPracticeSupplierId: newPracticeSupplierId,
      });
      mockInventoryRepo.findItemById.mockResolvedValueOnce(item).mockResolvedValueOnce({
        ...item,
        defaultPracticeSupplierId: newPracticeSupplierId,
      });

      const result = await itemService.updateItem(ctx, item.id, {
        defaultPracticeSupplierId: newPracticeSupplierId,
        unitPrice: 15.00,
      });

      expect(result.defaultPracticeSupplierId).toBe(newPracticeSupplierId);
      expect(mockInventoryRepo.upsertSupplierItem).toHaveBeenCalledWith(
        newSupplierId,
        item.id,
        expect.objectContaining({
          unitPrice: 15.00,
          practiceSupplierId: newPracticeSupplierId,
        }),
        expect.any(Object)
      );
    });

    it('should remove supplier when set to null', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const item = createTestItem(practice.id, 'prod-1');

      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockInventoryRepo.updateItem.mockResolvedValue({
        ...item,
        defaultPracticeSupplierId: null,
      });
      mockInventoryRepo.findItemById.mockResolvedValueOnce(item).mockResolvedValueOnce({
        ...item,
        defaultPracticeSupplierId: null,
      });

      const result = await itemService.updateItem(ctx, item.id, {
        defaultPracticeSupplierId: null,
      });

      expect(result.defaultPracticeSupplierId).toBeNull();
      expect(mockInventoryRepo.upsertSupplierItem).not.toHaveBeenCalled();
    });
  });

  describe('addItemFromCatalog', () => {
    it('should create item with supplier from catalog', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const product = createTestProduct();
      const practiceSupplierId = 'ps-123';
      const supplierId = 'supplier-456';

      mockProductRepo.findProductById.mockResolvedValue(product);
      mockProductRepo.findCatalogByPracticeSupplierProduct.mockResolvedValue({
        id: 'catalog-1',
        practiceSupplierId,
        productId: product.id,
        supplierId,
        supplierSku: 'CAT-SKU',
        unitPrice: 20.00,
        currency: 'EUR',
        minOrderQty: 5,
      });
      mockInventoryRepo.findItems.mockResolvedValue([]);
      mockPracticeSupplierRepo.findPracticeSupplierById.mockResolvedValue({
        id: practiceSupplierId,
        practiceId: practice.id,
        migratedFromSupplierId: supplierId,
        isBlocked: false,
      });
      mockInventoryRepo.createItem.mockResolvedValue({
        id: 'item-1',
        practiceId: practice.id,
        productId: product.id,
        name: 'Catalog Item',
        defaultPracticeSupplierId: practiceSupplierId,
      });
      mockInventoryRepo.upsertSupplierItem.mockResolvedValue({
        id: 'si-1',
        itemId: 'item-1',
        practiceSupplierId,
        supplierSku: 'CAT-SKU',
        unitPrice: 20.00,
        currency: 'EUR',
        minOrderQty: 5,
      });
      mockInventoryRepo.findItemById.mockResolvedValue({
        id: 'item-1',
        practiceId: practice.id,
        productId: product.id,
        name: 'Catalog Item',
        defaultPracticeSupplierId: practiceSupplierId,
        practiceSupplierItems: [{
          id: 'si-1',
          itemId: 'item-1',
          practiceSupplierId,
          supplierSku: null,
          unitPrice: 20.00,
          currency: null,
          minOrderQty: null,
        }],
      });

      const result = await itemService.addItemFromCatalog(ctx, {
        productId: product.id,
        globalSupplierId: supplierId,
        name: 'Catalog Item',
      });

      expect(result.id).toBe('item-1');
      expect(result.defaultPracticeSupplierId).toBe(practiceSupplierId);
      expect(mockInventoryRepo.upsertSupplierItem).toHaveBeenCalledWith(
        practiceSupplierId,
        'item-1',
        expect.objectContaining({
          supplierSku: 'CAT-SKU',
          unitPrice: 20.00,
          currency: 'EUR',
          minOrderQty: 5,
        }),
        expect.any(Object)
      );
    });

    it('should reject if product not in catalog', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const product = createTestProduct();
      const practiceSupplierId = 'ps-123';

      mockProductRepo.findProductById.mockResolvedValue(product);
      mockProductRepo.findCatalogByPracticeSupplierProduct.mockResolvedValue(null);

      await expect(
        itemService.addItemFromCatalog(ctx, {
          productId: product.id,
          globalSupplierId: 'gs-123',
          name: 'Test Item',
        })
      ).rejects.toThrow('This product is not available from the selected supplier');
    });

    it('should reject duplicate items', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const product = createTestProduct();
      const existingItem = createTestItem(practice.id, product.id);

      mockProductRepo.findProductById.mockResolvedValue(product);
      mockProductRepo.findCatalogByPracticeSupplierProduct.mockResolvedValue({
        id: 'catalog-1',
        practiceSupplierId: 'ps-123',
        productId: product.id,
      });
      mockInventoryRepo.findItems.mockResolvedValue([existingItem]);

      await expect(
        itemService.addItemFromCatalog(ctx, {
          productId: product.id,
          globalSupplierId: 'gs-123',
          name: 'Test Item',
        })
      ).rejects.toThrow('An item for this product already exists in your catalog');
    });
  });

  describe('attachSupplierToItem', () => {
    it('should attach supplier with pricing', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const item = createTestItem(practice.id, 'prod-1');
      const practiceSupplierId = 'ps-123';
      const supplierId = 'supplier-456';

      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockPracticeSupplierRepo.findPracticeSupplierById.mockResolvedValue({
        id: practiceSupplierId,
        practiceId: practice.id,
        migratedFromSupplierId: supplierId,
        isBlocked: false,
      });
      mockInventoryRepo.upsertSupplierItem.mockResolvedValue({
        id: 'si-1',
        supplierId,
        itemId: item.id,
        practiceSupplierId,
      });
      mockInventoryRepo.findItemById.mockResolvedValueOnce(item).mockResolvedValueOnce({
        ...item,
        supplierItems: [{
          id: 'si-1',
          practiceSupplierId,
        }],
      });

      const result = await itemService.attachSupplierToItem(ctx, item.id, {
        practiceSupplierId,
        unitPrice: 12.50,
        supplierSku: 'ATTACH-SKU',
      });

      expect(mockInventoryRepo.upsertSupplierItem).toHaveBeenCalledWith(
        supplierId,
        item.id,
        expect.objectContaining({
          supplierSku: 'ATTACH-SKU',
          unitPrice: 12.50,
          practiceSupplierId,
        }),
        expect.any(Object)
      );
    });

    it('should reject blocked supplier', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const item = createTestItem('practice-1', 'prod-1');
      const practiceSupplierId = 'ps-123';

      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockPracticeSupplierRepo.findPracticeSupplierById.mockResolvedValue({
        id: practiceSupplierId,
        isBlocked: true,
      });

      await expect(
        itemService.attachSupplierToItem(ctx, item.id, {
          practiceSupplierId,
        })
      ).rejects.toThrow('Cannot attach blocked supplier to item');
    });

    it('should reject if no legacy supplier mapping', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const item = createTestItem('practice-1', 'prod-1');
      const practiceSupplierId = 'ps-123';

      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockPracticeSupplierRepo.findPracticeSupplierById.mockResolvedValue({
        id: practiceSupplierId,
        practiceId: 'practice-1',
        migratedFromSupplierId: null,
        isBlocked: false,
      });

      await expect(
        itemService.attachSupplierToItem(ctx, item.id, {
          practiceSupplierId,
        })
      ).rejects.toThrow('Cannot attach supplier: missing legacy supplier mapping');
    });
  });

  describe('detachSupplierFromItem', () => {
    it('should detach supplier and clear default if needed', async () => {
      const practice = createTestPractice();
      const ctx = createTestContext({ role: 'STAFF', practiceId: practice.id });
      const practiceSupplierId = 'ps-123';
      const supplierId = 'supplier-456';
      const item = {
        ...createTestItem(practice.id, 'prod-1'),
        defaultPracticeSupplierId: practiceSupplierId,
        defaultSupplierId: supplierId,
      };

      const mockTx = {
        supplierItem: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'si-1',
            supplierId,
            itemId: item.id,
          }),
          delete: vi.fn(),
        },
      };

      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockPracticeSupplierRepo.findPracticeSupplierById.mockResolvedValue({
        id: practiceSupplierId,
        practiceId: practice.id,
        migratedFromSupplierId: supplierId,
      });
      mockInventoryRepo.updateItem.mockResolvedValue({
        ...item,
        defaultPracticeSupplierId: null,
      });
      mockInventoryRepo.findItemById.mockResolvedValueOnce(item).mockResolvedValueOnce({
        ...item,
        defaultPracticeSupplierId: null,
      });

      // Mock withTransaction to pass mockTx
      const { withTransaction } = await import('@/src/repositories/base');
      (withTransaction as any).mockImplementation((callback: any) => callback(mockTx));

      const result = await itemService.detachSupplierFromItem(ctx, item.id, practiceSupplierId);

      expect(mockTx.supplierItem.delete).toHaveBeenCalled();
      expect(mockInventoryRepo.updateItem).toHaveBeenCalledWith(
        item.id,
        practice.id,
        expect.objectContaining({
          defaultPracticeSupplierId: null,
        }),
        expect.any(Object)
      );
    });
  });
});

