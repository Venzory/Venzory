/**
 * Inventory Operations Unit Tests
 * Tests for inventory adjustments, transfers, and queries
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
  ValidationError,
  BusinessRuleViolationError,
  ForbiddenError,
} from '@/src/domain/errors';
import {
  createTestContext,
  createTestPractice,
  createTestLocation,
  createTestItem,
  createTestProduct,
  createTestInventory,
  resetCounters,
} from '@/__tests__/fixtures/inventory-fixtures';

// Mock the notification check
vi.mock('@/lib/notifications', () => ({
  checkAndCreateLowStockNotification: vi.fn(),
}));

// Mock the withTransaction helper to execute callback immediately without DB
vi.mock('@/src/repositories/base', () => ({
  BaseRepository: class {},
  withTransaction: vi.fn((callback) => callback({})),
}));

describe('Inventory Operations', () => {
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
      getLocationInventory: vi.fn(),
      upsertLocationInventory: vi.fn(),
      createStockAdjustment: vi.fn(),
      createInventoryTransfer: vi.fn(),
      findManyItems: vi.fn(),
      findItems: vi.fn(),
      countItems: vi.fn(),
      adjustStock: vi.fn(),
    };

    mockProductRepo = {};
    mockLocationRepo = {
      findLocationById: vi.fn(),
    };

    mockStockCountRepo = {};
    mockUserRepo = {};

    mockAuditService = {
      logStockAdjusted: vi.fn(),
      logInventoryTransferred: vi.fn(),
      logStockAdjustment: vi.fn(),
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

  describe('adjustStock', () => {
    it('should increase quantity with positive adjustment', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);

      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockLocationRepo.findLocationById.mockResolvedValue(location);
      mockInventoryRepo.getLocationInventory.mockResolvedValue({
        locationId: location.id,
        itemId: item.id,
        quantity: 10,
        reorderPoint: 5,
        reorderQuantity: 20,
      });
      mockInventoryRepo.adjustStock.mockResolvedValue({
        newQuantity: 15,
      });
      mockInventoryRepo.createStockAdjustment.mockResolvedValue({
        id: 'adjustment-1',
      });

      await inventoryService.adjustStock(ctx, {
        itemId: item.id,
        locationId: location.id,
        quantity: 5,
        reason: 'Restock',
        note: 'Added new stock',
      });

      expect(mockInventoryRepo.adjustStock).toHaveBeenCalledWith(
        location.id,
        item.id,
        5,
        ctx.practiceId,
        expect.anything()
      );
      expect(mockInventoryRepo.createStockAdjustment).toHaveBeenCalled();
    });

    it('should decrease quantity with negative adjustment', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);

      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockLocationRepo.findLocationById.mockResolvedValue(location);
      mockInventoryRepo.getLocationInventory.mockResolvedValue({
        locationId: location.id,
        itemId: item.id,
        quantity: 10,
        reorderPoint: 5,
        reorderQuantity: 20,
      });
      mockInventoryRepo.adjustStock.mockResolvedValue({
        newQuantity: 7,
      });
      mockInventoryRepo.createStockAdjustment.mockResolvedValue({
        id: 'adjustment-2',
      });

      await inventoryService.adjustStock(ctx, {
        itemId: item.id,
        locationId: location.id,
        quantity: -3,
        reason: 'Damaged',
        note: 'Items damaged',
      });

      expect(mockInventoryRepo.adjustStock).toHaveBeenCalledWith(
        location.id,
        item.id,
        -3,
        ctx.practiceId,
        expect.anything()
      );
      expect(mockInventoryRepo.createStockAdjustment).toHaveBeenCalled();
    });

    it('should prevent negative final inventory', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);

      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockLocationRepo.findLocationById.mockResolvedValue(location);
      mockInventoryRepo.getLocationInventory.mockResolvedValue({
        locationId: location.id,
        itemId: item.id,
        quantity: 5,
      });

      await expect(
        inventoryService.adjustStock(ctx, {
          itemId: item.id,
          locationId: location.id,
          quantity: -10, // Would result in -5
          reason: 'Test',
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        inventoryService.adjustStock(ctx, {
          itemId: item.id,
          locationId: location.id,
          quantity: -10,
          reason: 'Test',
        })
      ).rejects.toThrow('would result in negative quantity');
    });

    it('should create StockAdjustment record', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);

      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockLocationRepo.findLocationById.mockResolvedValue(location);
      mockInventoryRepo.getLocationInventory.mockResolvedValue({
        quantity: 10,
      });
      mockInventoryRepo.adjustStock.mockResolvedValue({
        newQuantity: 15,
      });
      mockInventoryRepo.createStockAdjustment.mockResolvedValue({
        id: 'adjustment-1',
      });

      await inventoryService.adjustStock(ctx, {
        itemId: item.id,
        locationId: location.id,
        quantity: 5,
        reason: 'Restock',
        note: 'Added new stock',
      });

      expect(mockInventoryRepo.createStockAdjustment).toHaveBeenCalledWith(
        ctx.practiceId,
        ctx.userId,
        {
          itemId: item.id,
          locationId: location.id,
          quantity: 5,
          reason: 'Restock',
          note: 'Added new stock',
        },
        expect.anything()
      );
    });

    it('should create audit log entry', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);

      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockLocationRepo.findLocationById.mockResolvedValue(location);
      mockInventoryRepo.getLocationInventory.mockResolvedValue({ quantity: 10 });
      mockInventoryRepo.adjustStock.mockResolvedValue({
        newQuantity: 15,
      });
      mockInventoryRepo.createStockAdjustment.mockResolvedValue({
        id: 'adjustment-1',
      });

      await inventoryService.adjustStock(ctx, {
        itemId: item.id,
        locationId: location.id,
        quantity: 5,
        reason: 'Restock',
      });

      expect(mockInventoryRepo.adjustStock).toHaveBeenCalled();
      expect(mockInventoryRepo.createStockAdjustment).toHaveBeenCalled();
    });

    it('should require STAFF role', async () => {
      const ctx = createTestContext({ role: 'VIEWER' });

      await expect(
        inventoryService.adjustStock(ctx, {
          itemId: 'item-1',
          locationId: 'loc-1',
          quantity: 5,
          reason: 'Test',
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('transferInventory', () => {
    it('should transfer between locations atomically', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const fromLocation = createTestLocation(practice.id, { name: 'From Location' });
      const toLocation = createTestLocation(practice.id, { name: 'To Location' });
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);

      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockLocationRepo.findLocationById
        .mockResolvedValueOnce(fromLocation)
        .mockResolvedValueOnce(toLocation);
      mockInventoryRepo.getLocationInventory
        .mockResolvedValueOnce({ quantity: 10 }) // Source
        .mockResolvedValueOnce({ quantity: 5 }); // Destination
      mockInventoryRepo.adjustStock.mockResolvedValue({ newQuantity: 0 });

      await inventoryService.transferInventory(ctx, {
        itemId: item.id,
        fromLocationId: fromLocation.id,
        toLocationId: toLocation.id,
        quantity: 3,
        note: 'Transfer test',
      });

      // Should call adjustStock twice (decrease source, increase destination)
      expect(mockInventoryRepo.adjustStock).toHaveBeenCalledTimes(2);
      expect(mockInventoryRepo.adjustStock).toHaveBeenNthCalledWith(
        1,
        fromLocation.id,
        item.id,
        -3,
        ctx.practiceId,
        expect.anything()
      );
      expect(mockInventoryRepo.adjustStock).toHaveBeenNthCalledWith(
        2,
        toLocation.id,
        item.id,
        3,
        ctx.practiceId,
        expect.anything()
      );
    });

    it('should prevent transfer to same location', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const location = createTestLocation(ctx.practiceId);

      await expect(
        inventoryService.transferInventory(ctx, {
          itemId: 'item-1',
          fromLocationId: location.id,
          toLocationId: location.id, // Same location
          quantity: 5,
        })
      ).rejects.toThrow(ValidationError);
      await expect(
        inventoryService.transferInventory(ctx, {
          itemId: 'item-1',
          fromLocationId: location.id,
          toLocationId: location.id,
          quantity: 5,
        })
      ).rejects.toThrow('Cannot transfer to the same location');
    });

    it('should prevent transfer with insufficient source quantity', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const fromLocation = createTestLocation(practice.id);
      const toLocation = createTestLocation(practice.id);
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);

      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockLocationRepo.findLocationById
        .mockResolvedValueOnce(fromLocation)
        .mockResolvedValueOnce(toLocation);
      mockInventoryRepo.getLocationInventory
        .mockResolvedValueOnce({ quantity: 3 }); // Only 3 available

      await expect(
        inventoryService.transferInventory(ctx, {
          itemId: item.id,
          fromLocationId: fromLocation.id,
          toLocationId: toLocation.id,
          quantity: 5, // Trying to transfer 5
        })
      ).rejects.toThrow(BusinessRuleViolationError);
      await expect(
        inventoryService.transferInventory(ctx, {
          itemId: item.id,
          fromLocationId: fromLocation.id,
          toLocationId: toLocation.id,
          quantity: 5,
        })
      ).rejects.toThrow('Insufficient stock at source location');
    });

    it('should create InventoryTransfer record', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const fromLocation = createTestLocation(practice.id);
      const toLocation = createTestLocation(practice.id);
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);

      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockLocationRepo.findLocationById
        .mockResolvedValueOnce(fromLocation)
        .mockResolvedValueOnce(toLocation);
      mockInventoryRepo.getLocationInventory
        .mockResolvedValueOnce({ quantity: 10 })
        .mockResolvedValueOnce({ quantity: 5 });
      mockInventoryRepo.adjustStock.mockResolvedValue({ newQuantity: 0 });

      await inventoryService.transferInventory(ctx, {
        itemId: item.id,
        fromLocationId: fromLocation.id,
        toLocationId: toLocation.id,
        quantity: 3,
        note: 'Transfer note',
      });

      expect(mockInventoryRepo.createInventoryTransfer).toHaveBeenCalledWith(
        ctx.practiceId,
        ctx.userId,
        {
          itemId: item.id,
          fromLocationId: fromLocation.id,
          toLocationId: toLocation.id,
          quantity: 3,
          note: 'Transfer note',
        },
        expect.anything()
      );
    });

    it('should update both source and destination inventory', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const fromLocation = createTestLocation(practice.id);
      const toLocation = createTestLocation(practice.id);
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);

      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockLocationRepo.findLocationById
        .mockResolvedValueOnce(fromLocation)
        .mockResolvedValueOnce(toLocation);
      mockInventoryRepo.getLocationInventory
        .mockResolvedValueOnce({ quantity: 20, reorderPoint: 10 })
        .mockResolvedValueOnce({ quantity: 0, reorderPoint: 5 });
      mockInventoryRepo.adjustStock.mockResolvedValue({ newQuantity: 0 });

      await inventoryService.transferInventory(ctx, {
        itemId: item.id,
        fromLocationId: fromLocation.id,
        toLocationId: toLocation.id,
        quantity: 8,
      });

      // Verify both adjustments
      expect(mockInventoryRepo.adjustStock).toHaveBeenCalledTimes(2);
      expect(mockInventoryRepo.adjustStock).toHaveBeenNthCalledWith(
        1,
        fromLocation.id,
        item.id,
        -8,
        ctx.practiceId,
        expect.anything()
      );
      expect(mockInventoryRepo.adjustStock).toHaveBeenNthCalledWith(
        2,
        toLocation.id,
        item.id,
        8,
        ctx.practiceId,
        expect.anything()
      );
    });

    it('should require STAFF role', async () => {
      const ctx = createTestContext({ role: 'VIEWER' });

      await expect(
        inventoryService.transferInventory(ctx, {
          itemId: 'item-1',
          fromLocationId: 'loc-1',
          toLocationId: 'loc-2',
          quantity: 5,
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('findItems with location filter', () => {
    it('should return items with correct per-location quantities', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);

      const mockItems = [
        {
          ...item,
          inventory: [
            {
              locationId: location.id,
              quantity: 10,
              reorderPoint: 5,
            },
          ],
        },
      ];

      mockInventoryRepo.findItems.mockResolvedValue(mockItems);
      mockInventoryRepo.countItems = vi.fn().mockResolvedValue(mockItems.length);

      const result = await inventoryService.findItems(ctx, {});

      expect(result.items).toEqual(mockItems);
      expect(result.totalCount).toBe(mockItems.length);
      expect(result.items[0].inventory[0].quantity).toBe(10);
    });

    it('should filter by locationId correctly', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location1 = createTestLocation(practice.id);
      const location2 = createTestLocation(practice.id);
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);

      const mockItems = [
        {
          ...item,
          inventory: [
            { locationId: location1.id, quantity: 10 },
          ],
        },
      ];

      mockInventoryRepo.findItems.mockResolvedValue(mockItems);
      mockInventoryRepo.countItems = vi.fn().mockResolvedValue(mockItems.length);

      const result = await inventoryService.findItems(ctx, {
        locationId: location1.id,
      });

      expect(result.items).toEqual(mockItems);
      expect(result.totalCount).toBe(mockItems.length);
    });

    it('should handle low stock filter correctly', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);

      const mockItems = [
        {
          ...item,
          inventory: [
            {
              locationId: location.id,
              quantity: 3,
              reorderPoint: 5, // Below reorder point
            },
          ],
        },
      ];

      mockInventoryRepo.findItems.mockResolvedValue(mockItems);
      mockInventoryRepo.countItems = vi.fn().mockResolvedValue(mockItems.length);

      const result = await inventoryService.findItems(ctx, {
        lowStockOnly: true,
      });

      expect(result.items).toEqual(mockItems);
      expect(result.totalCount).toBe(mockItems.length);
    });

    it('should pass search filter to repository', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id, { name: 'Aspirin' });

      mockInventoryRepo.findItems.mockResolvedValue([item]);
      mockInventoryRepo.countItems.mockResolvedValue(1);

      await inventoryService.findItems(ctx, { search: 'asp' });

      expect(mockInventoryRepo.findItems).toHaveBeenCalledWith(
        ctx.practiceId,
        { search: 'asp' },
        expect.objectContaining({
          pagination: expect.any(Object),
          orderBy: expect.any(Object),
        })
      );
    });

    it('should pass supplierId filter to repository', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const supplierId = 'supplier-123';

      mockInventoryRepo.findItems.mockResolvedValue([]);
      mockInventoryRepo.countItems.mockResolvedValue(0);

      await inventoryService.findItems(ctx, { supplierId });

      expect(mockInventoryRepo.findItems).toHaveBeenCalledWith(
        ctx.practiceId,
        { supplierId },
        expect.any(Object)
      );
    });

    it('should apply pagination options correctly', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      mockInventoryRepo.findItems.mockResolvedValue([]);
      mockInventoryRepo.countItems.mockResolvedValue(0);

      await inventoryService.findItems(ctx, {}, { page: 2, limit: 25 });

      expect(mockInventoryRepo.findItems).toHaveBeenCalledWith(
        ctx.practiceId,
        {},
        expect.objectContaining({
          pagination: { page: 2, limit: 25 },
        })
      );
    });

    it('should apply sorting options correctly', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      mockInventoryRepo.findItems.mockResolvedValue([]);
      mockInventoryRepo.countItems.mockResolvedValue(0);

      await inventoryService.findItems(ctx, {}, { sortBy: 'sku', sortOrder: 'desc' });

      expect(mockInventoryRepo.findItems).toHaveBeenCalledWith(
        ctx.practiceId,
        {},
        expect.objectContaining({
          orderBy: { sku: 'desc' },
        })
      );
    });

    it('should use default sorting when no sortBy provided', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      mockInventoryRepo.findItems.mockResolvedValue([]);
      mockInventoryRepo.countItems.mockResolvedValue(0);

      await inventoryService.findItems(ctx, {});

      expect(mockInventoryRepo.findItems).toHaveBeenCalledWith(
        ctx.practiceId,
        {},
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );
    });

    it('should return both items and totalCount', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const product = createTestProduct();
      const items = [
        createTestItem(practice.id, product.id, { name: 'Item 1' }),
        createTestItem(practice.id, product.id, { name: 'Item 2' }),
      ];

      mockInventoryRepo.findItems.mockResolvedValue(items);
      mockInventoryRepo.countItems.mockResolvedValue(10); // Total in DB might be more

      const result = await inventoryService.findItems(ctx, {}, { page: 1, limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(10);
    });
  });
});

