/**
 * Stock Count Service Unit Tests
 * Comprehensive tests for stock counting logic including:
 * - Session creation and management
 * - Count line operations
 * - Concurrency detection
 * - Admin override
 * - Edge cases
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
  ConcurrencyError,
} from '@/src/domain/errors';
import {
  createTestContext,
  createTestPractice,
  createTestLocation,
  createTestItem,
  createTestProduct,
  createTestInventory,
  createTestStockCountSession,
  createTestStockCountLine,
  resetCounters,
} from '@/__tests__/fixtures/inventory-fixtures';
import { StockCountStatus } from '@prisma/client';

// Mock the notification check
vi.mock('@/lib/notifications', () => ({
  checkAndCreateLowStockNotification: vi.fn(),
}));

// Mock the withTransaction helper to execute callback immediately without DB
vi.mock('@/src/repositories/base', () => ({
  BaseRepository: class {},
  withTransaction: vi.fn((callback) => callback({})),
}));

describe('Stock Count Service', () => {
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
    };

    mockProductRepo = {};
    mockLocationRepo = {
      findLocationById: vi.fn(),
    };

    mockStockCountRepo = {
      createStockCountSession: vi.fn(),
      findStockCountSessionById: vi.fn(),
      findStockCountLineBySessionAndItem: vi.fn(),
      createStockCountLine: vi.fn(),
      updateStockCountLine: vi.fn(),
      deleteStockCountLine: vi.fn(),
      findStockCountLineById: vi.fn(),
      updateStockCountSessionStatus: vi.fn(),
      detectInventoryChanges: vi.fn(),
      findInProgressSessionByLocation: vi.fn(),
    };

    mockUserRepo = {};

    mockAuditService = {
      logStockCountSessionCreated: vi.fn(),
      logStockCountLineAdded: vi.fn(),
      logStockCountLineUpdated: vi.fn(),
      logStockCountLineRemoved: vi.fn(),
      logStockCountCompleted: vi.fn(),
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

  describe('createStockCountSession', () => {
    it('should create session with valid inputs', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);

      mockLocationRepo.findLocationById.mockResolvedValue(location);
      mockStockCountRepo.findInProgressSessionByLocation.mockResolvedValue(null);
      mockStockCountRepo.createStockCountSession.mockResolvedValue({
        id: 'session-1',
        practiceId: ctx.practiceId,
        locationId: location.id,
        status: StockCountStatus.IN_PROGRESS,
        createdById: ctx.userId,
        notes: null,
        completedAt: null,
        createdAt: new Date(),
      });

      const result = await inventoryService.createStockCountSession(ctx, location.id, 'Test notes');

      expect(result).toEqual({ id: 'session-1' });
      expect(mockLocationRepo.findLocationById).toHaveBeenCalledWith(
        location.id,
        ctx.practiceId,
        expect.anything()
      );
      expect(mockStockCountRepo.findInProgressSessionByLocation).toHaveBeenCalledWith(
        ctx.practiceId,
        location.id,
        expect.anything()
      );
      expect(mockStockCountRepo.createStockCountSession).toHaveBeenCalled();
      expect(mockAuditService.logStockCountSessionCreated).toHaveBeenCalled();
    });

    it('should throw BusinessRuleViolationError when IN_PROGRESS session already exists for location', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);

      mockLocationRepo.findLocationById.mockResolvedValue(location);
      mockStockCountRepo.findInProgressSessionByLocation.mockResolvedValue({
        id: 'existing-session',
        practiceId: ctx.practiceId,
        locationId: location.id,
        status: StockCountStatus.IN_PROGRESS,
        createdById: ctx.userId!,
        notes: null,
        completedAt: null,
        createdAt: new Date(),
      });

      await expect(
        inventoryService.createStockCountSession(ctx, location.id)
      ).rejects.toThrow(BusinessRuleViolationError);
      await expect(
        inventoryService.createStockCountSession(ctx, location.id)
      ).rejects.toThrow('An in-progress stock count already exists for this location');

      expect(mockStockCountRepo.createStockCountSession).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when userId is null', async () => {
      const ctx = createTestContext({ userId: null } as any);
      const location = createTestLocation(ctx.practiceId);

      await expect(
        inventoryService.createStockCountSession(ctx, location.id)
      ).rejects.toThrow(ValidationError);
      await expect(
        inventoryService.createStockCountSession(ctx, location.id)
      ).rejects.toThrow('User ID required to create stock count session');
    });

    it('should require STAFF role', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const location = createTestLocation(ctx.practiceId);

      await expect(
        inventoryService.createStockCountSession(ctx, location.id)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('addCountLine', () => {
    it('should add new line with correct variance calculation', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      const systemQuantity = 10;
      const countedQuantity = 8;
      const variance = countedQuantity - systemQuantity; // -2

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue({
        ...session,
        status: StockCountStatus.IN_PROGRESS,
      });
      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockInventoryRepo.getLocationInventory.mockResolvedValue({
        locationId: location.id,
        itemId: item.id,
        quantity: systemQuantity,
      });
      mockStockCountRepo.findStockCountLineBySessionAndItem.mockResolvedValue(null);
      mockStockCountRepo.createStockCountLine.mockResolvedValue({
        id: 'line-1',
        sessionId: session.id,
        itemId: item.id,
        countedQuantity,
        systemQuantity,
        variance,
      });

      const result = await inventoryService.addCountLine(ctx, session.id, item.id, countedQuantity);

      expect(result).toEqual({ lineId: 'line-1', variance });
      expect(mockStockCountRepo.createStockCountLine).toHaveBeenCalledWith(
        session.id,
        item.id,
        countedQuantity,
        systemQuantity,
        variance,
        null,
        expect.anything()
      );
    });

    it('should update existing line if same item added twice', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      const existingLine = {
        id: 'line-1',
        sessionId: session.id,
        itemId: item.id,
        countedQuantity: 8,
        systemQuantity: 10,
        variance: -2,
      };

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue({
        ...session,
        status: StockCountStatus.IN_PROGRESS,
      });
      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockInventoryRepo.getLocationInventory.mockResolvedValue({
        quantity: 10,
      });
      mockStockCountRepo.findStockCountLineBySessionAndItem.mockResolvedValue(existingLine);
      mockStockCountRepo.updateStockCountLine.mockResolvedValue({
        ...existingLine,
        countedQuantity: 12,
        variance: 2,
      });

      const result = await inventoryService.addCountLine(ctx, session.id, item.id, 12);

      expect(result.variance).toBe(2);
      expect(mockStockCountRepo.updateStockCountLine).toHaveBeenCalled();
      expect(mockAuditService.logStockCountLineUpdated).toHaveBeenCalled();
    });

    it('should handle item with no inventory (system = 0)', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue({
        ...session,
        status: StockCountStatus.IN_PROGRESS,
      });
      mockInventoryRepo.findItemById.mockResolvedValue(item);
      mockInventoryRepo.getLocationInventory.mockResolvedValue(null); // No inventory
      mockStockCountRepo.findStockCountLineBySessionAndItem.mockResolvedValue(null);
      mockStockCountRepo.createStockCountLine.mockResolvedValue({
        id: 'line-1',
        countedQuantity: 5,
        systemQuantity: 0,
        variance: 5,
      });

      const result = await inventoryService.addCountLine(ctx, session.id, item.id, 5);

      expect(result.variance).toBe(5);
    });

    it('should validate non-negative counted quantity', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      await expect(
        inventoryService.addCountLine(ctx, 'session-1', 'item-1', -5)
      ).rejects.toThrow(ValidationError);
      await expect(
        inventoryService.addCountLine(ctx, 'session-1', 'item-1', -5)
      ).rejects.toThrow('must be non-negative');
    });

    it('should throw error when session is not IN_PROGRESS', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!, {
        status: StockCountStatus.COMPLETED,
      });

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue(session);

      await expect(
        inventoryService.addCountLine(ctx, session.id, 'item-1', 5)
      ).rejects.toThrow(BusinessRuleViolationError);
      await expect(
        inventoryService.addCountLine(ctx, session.id, 'item-1', 5)
      ).rejects.toThrow('Cannot edit completed session');
    });
  });

  describe('updateCountLine', () => {
    it('should update counted quantity and recalculate variance', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const product = createTestProduct();
      const item = createTestItem(practice.id, product.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      const line = {
        id: 'line-1',
        sessionId: session.id,
        itemId: item.id,
        countedQuantity: 8,
        systemQuantity: 10,
        variance: -2,
        notes: null,
        item: { id: item.id, name: item.name },
        session: {
          practiceId: practice.id,
          status: StockCountStatus.IN_PROGRESS,
        },
      };

      mockStockCountRepo.findStockCountLineById.mockResolvedValue({
        ...line,
        session: {
          ...line.session,
          practiceId: ctx.practiceId,
        },
      });
      mockStockCountRepo.updateStockCountLine.mockResolvedValue({
        ...line,
        countedQuantity: 12,
        variance: 2,
      });

      const result = await inventoryService.updateCountLine(ctx, 'line-1', 12);

      expect(result.variance).toBe(2);
      expect(mockStockCountRepo.updateStockCountLine).toHaveBeenCalledWith(
        'line-1',
        12,
        2,
        null,
        expect.anything()
      );
    });

    it('should validate non-negative counted quantity', async () => {
      const ctx = createTestContext({ role: 'STAFF' });

      await expect(
        inventoryService.updateCountLine(ctx, 'line-1', -3)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error when session completed', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const line = {
        id: 'line-1',
        session: {
          practiceId: ctx.practiceId,
          status: StockCountStatus.COMPLETED,
        },
      };

      mockStockCountRepo.findStockCountLineById.mockResolvedValue(line);

      await expect(
        inventoryService.updateCountLine(ctx, 'line-1', 10)
      ).rejects.toThrow(BusinessRuleViolationError);
    });
  });

  describe('completeStockCount - core logic', () => {
    it('should complete without adjustments (only marks COMPLETED)', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue({
        ...session,
        status: StockCountStatus.IN_PROGRESS,
        location: { name: location.name },
        lines: [
          {
            id: 'line-1',
            itemId: 'item-1',
            countedQuantity: 10,
            systemQuantity: 10,
            variance: 0,
            item: { name: 'Test Item' },
          },
        ],
      });
      mockStockCountRepo.detectInventoryChanges.mockResolvedValue({
        hasChanges: false,
        changes: [],
      });
      mockStockCountRepo.updateStockCountSessionStatus.mockResolvedValue({});

      const result = await inventoryService.completeStockCount(ctx, session.id, false);

      expect(result.adjustedItems).toBe(0);
      expect(mockInventoryRepo.upsertLocationInventory).not.toHaveBeenCalled();
      expect(mockInventoryRepo.createStockAdjustment).not.toHaveBeenCalled();
    });

    it('should apply adjustments and update LocationInventory correctly', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue({
        ...session,
        status: StockCountStatus.IN_PROGRESS,
        location: { name: location.name },
        lines: [
          {
            id: 'line-1',
            itemId: 'item-1',
            countedQuantity: 8,
            systemQuantity: 10,
            variance: -2,
            item: { name: 'Test Item' },
          },
        ],
      });
      mockStockCountRepo.detectInventoryChanges.mockResolvedValue({
        hasChanges: false,
        changes: [],
      });
      mockInventoryRepo.getLocationInventory.mockResolvedValue({
        quantity: 10,
        reorderPoint: 5,
        reorderQuantity: 20,
      });

      const result = await inventoryService.completeStockCount(ctx, session.id, true);

      expect(result.adjustedItems).toBe(1);
      expect(mockInventoryRepo.upsertLocationInventory).toHaveBeenCalledWith(
        location.id,
        'item-1',
        8, // counted quantity
        5, // reorderPoint preserved
        20, // reorderQuantity preserved
        expect.anything()
      );
      expect(mockInventoryRepo.createStockAdjustment).toHaveBeenCalledWith(
        ctx.practiceId,
        ctx.userId,
        expect.objectContaining({
          itemId: 'item-1',
          locationId: location.id,
          quantity: -2,
          reason: 'Stock Count',
        }),
        expect.anything()
      );
    });

    it('should skip lines with zero variance', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue({
        ...session,
        status: StockCountStatus.IN_PROGRESS,
        location: { name: location.name },
        lines: [
          {
            id: 'line-1',
            itemId: 'item-1',
            countedQuantity: 10,
            systemQuantity: 10,
            variance: 0,
            item: { name: 'Test Item' },
          },
        ],
      });
      mockStockCountRepo.detectInventoryChanges.mockResolvedValue({
        hasChanges: false,
        changes: [],
      });

      const result = await inventoryService.completeStockCount(ctx, session.id, true);

      expect(result.adjustedItems).toBe(0);
      expect(mockInventoryRepo.upsertLocationInventory).not.toHaveBeenCalled();
    });

    it('should prevent negative final inventory', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue({
        ...session,
        status: StockCountStatus.IN_PROGRESS,
        location: { name: location.name },
        lines: [
          {
            id: 'line-1',
            itemId: 'item-1',
            countedQuantity: -5, // This would cause negative inventory
            systemQuantity: 10,
            variance: -15,
            item: { name: 'Test Item' },
          },
        ],
      });
      mockStockCountRepo.detectInventoryChanges.mockResolvedValue({
        hasChanges: false,
        changes: [],
      });

      await expect(
        inventoryService.completeStockCount(ctx, session.id, true)
      ).rejects.toThrow(BusinessRuleViolationError);
      await expect(
        inventoryService.completeStockCount(ctx, session.id, true)
      ).rejects.toThrow('would result in negative inventory');
    });

    it('should require at least one line', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue({
        ...session,
        status: StockCountStatus.IN_PROGRESS,
        location: { name: location.name },
        lines: [],
      });

      await expect(
        inventoryService.completeStockCount(ctx, session.id, true)
      ).rejects.toThrow(ValidationError);
      await expect(
        inventoryService.completeStockCount(ctx, session.id, true)
      ).rejects.toThrow('must have at least one line');
    });

    it('should handle items with no existing LocationInventory record (creates new)', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue({
        ...session,
        status: StockCountStatus.IN_PROGRESS,
        location: { name: location.name },
        lines: [
          {
            id: 'line-1',
            itemId: 'item-1',
            countedQuantity: 5,
            systemQuantity: 0, // No previous inventory
            variance: 5,
            item: { name: 'Test Item' },
          },
        ],
      });
      mockStockCountRepo.detectInventoryChanges.mockResolvedValue({
        hasChanges: false,
        changes: [],
      });
      mockInventoryRepo.getLocationInventory.mockResolvedValue(null); // No existing record

      const result = await inventoryService.completeStockCount(ctx, session.id, true);

      expect(result.adjustedItems).toBe(1);
      expect(mockInventoryRepo.upsertLocationInventory).toHaveBeenCalledWith(
        location.id,
        'item-1',
        5,
        undefined, // No reorderPoint
        undefined, // No reorderQuantity
        expect.anything()
      );
    });
  });

  describe('completeStockCount - concurrency scenarios', () => {
    it('should detect when inventory changed since count started', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue({
        ...session,
        status: StockCountStatus.IN_PROGRESS,
        location: { name: location.name },
        lines: [
          {
            id: 'line-1',
            itemId: 'item-1',
            countedQuantity: 8,
            systemQuantity: 10,
            variance: -2,
            item: { name: 'Test Item' },
          },
        ],
      });
      mockStockCountRepo.detectInventoryChanges.mockResolvedValue({
        hasChanges: true,
        changes: [
          {
            itemId: 'item-1',
            itemName: 'Test Item',
            systemAtCount: 10,
            systemNow: 12,
            difference: 2,
          },
        ],
      });

      await expect(
        inventoryService.completeStockCount(ctx, session.id, true, false)
      ).rejects.toThrow(ConcurrencyError);
      await expect(
        inventoryService.completeStockCount(ctx, session.id, true, false)
      ).rejects.toThrow('Inventory changed during count');
    });

    it('should allow STAFF to complete without adjustments even with changes', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue({
        ...session,
        status: StockCountStatus.IN_PROGRESS,
        location: { name: location.name },
        lines: [
          {
            id: 'line-1',
            itemId: 'item-1',
            countedQuantity: 8,
            systemQuantity: 10,
            variance: -2,
            item: { name: 'Test Item' },
          },
        ],
      });
      mockStockCountRepo.detectInventoryChanges.mockResolvedValue({
        hasChanges: true,
        changes: [
          {
            itemId: 'item-1',
            itemName: 'Test Item',
            systemAtCount: 10,
            systemNow: 12,
            difference: 2,
          },
        ],
      });

      // Should not throw when not applying adjustments
      const result = await inventoryService.completeStockCount(ctx, session.id, false);
      expect(result.adjustedItems).toBe(0);
    });

    it('should allow ADMIN to override with adminOverride=true', async () => {
      const ctx = createTestContext({ role: 'ADMIN' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue({
        ...session,
        status: StockCountStatus.IN_PROGRESS,
        location: { name: location.name },
        lines: [
          {
            id: 'line-1',
            itemId: 'item-1',
            countedQuantity: 8,
            systemQuantity: 10,
            variance: -2,
            item: { name: 'Test Item' },
          },
        ],
      });
      mockStockCountRepo.detectInventoryChanges.mockResolvedValue({
        hasChanges: true,
        changes: [
          {
            itemId: 'item-1',
            itemName: 'Test Item',
            systemAtCount: 10,
            systemNow: 12,
            difference: 2,
          },
        ],
      });
      mockInventoryRepo.getLocationInventory.mockResolvedValue({ quantity: 12 });

      const result = await inventoryService.completeStockCount(ctx, session.id, true, true);

      expect(result.adjustedItems).toBe(1);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('System quantity changed from 10 to 12');
    });

    it('should require ADMIN role for override', async () => {
      const ctx = createTestContext({ role: 'STAFF' }); // Not ADMIN
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue({
        ...session,
        status: StockCountStatus.IN_PROGRESS,
        location: { name: location.name },
        lines: [{ id: 'line-1', itemId: 'item-1', countedQuantity: 8, systemQuantity: 10, variance: -2, item: { name: 'Test Item' } }],
      });
      mockStockCountRepo.detectInventoryChanges.mockResolvedValue({
        hasChanges: true,
        changes: [{ itemId: 'item-1', itemName: 'Test Item', systemAtCount: 10, systemNow: 12, difference: 2 }],
      });

      await expect(
        inventoryService.completeStockCount(ctx, session.id, true, true)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('completeStockCount - edge cases', () => {
    it('should handle mix of positive and negative variances', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue({
        ...session,
        status: StockCountStatus.IN_PROGRESS,
        location: { name: location.name },
        lines: [
          { id: 'line-1', itemId: 'item-1', countedQuantity: 8, systemQuantity: 10, variance: -2, item: { name: 'Item A' } },
          { id: 'line-2', itemId: 'item-2', countedQuantity: 15, systemQuantity: 10, variance: 5, item: { name: 'Item B' } },
          { id: 'line-3', itemId: 'item-3', countedQuantity: 10, systemQuantity: 10, variance: 0, item: { name: 'Item C' } },
        ],
      });
      mockStockCountRepo.detectInventoryChanges.mockResolvedValue({
        hasChanges: false,
        changes: [],
      });
      mockInventoryRepo.getLocationInventory.mockResolvedValue({ quantity: 10 });

      const result = await inventoryService.completeStockCount(ctx, session.id, true);

      expect(result.adjustedItems).toBe(2); // Only items with non-zero variance
      expect(mockInventoryRepo.createStockAdjustment).toHaveBeenCalledTimes(2);
    });

    it('should handle large variance values', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue({
        ...session,
        status: StockCountStatus.IN_PROGRESS,
        location: { name: location.name },
        lines: [
          { id: 'line-1', itemId: 'item-1', countedQuantity: 1000, systemQuantity: 10, variance: 990, item: { name: 'Item A' } },
        ],
      });
      mockStockCountRepo.detectInventoryChanges.mockResolvedValue({
        hasChanges: false,
        changes: [],
      });
      mockInventoryRepo.getLocationInventory.mockResolvedValue({ quantity: 10 });

      const result = await inventoryService.completeStockCount(ctx, session.id, true);

      expect(result.adjustedItems).toBe(1);
      expect(mockInventoryRepo.upsertLocationInventory).toHaveBeenCalledWith(
        location.id,
        'item-1',
        1000,
        undefined,
        undefined,
        expect.anything()
      );
    });

    it('should handle multiple items at same location', async () => {
      const ctx = createTestContext({ role: 'STAFF' });
      const practice = createTestPractice();
      const location = createTestLocation(practice.id);
      const session = createTestStockCountSession(practice.id, location.id, ctx.userId!);

      const lines = Array.from({ length: 10 }, (_, i) => ({
        id: `line-${i}`,
        itemId: `item-${i}`,
        countedQuantity: 11 + i, // Start at 11 so all have positive variance (none are 0)
        systemQuantity: 10,
        variance: (11 + i) - 10,
        item: { name: `Item ${i}` },
      }));

      mockStockCountRepo.findStockCountSessionById.mockResolvedValue({
        ...session,
        status: StockCountStatus.IN_PROGRESS,
        location: { name: location.name },
        lines,
      });
      mockStockCountRepo.detectInventoryChanges.mockResolvedValue({
        hasChanges: false,
        changes: [],
      });
      mockInventoryRepo.getLocationInventory.mockResolvedValue({ quantity: 10 });

      const result = await inventoryService.completeStockCount(ctx, session.id, true);

      expect(result.adjustedItems).toBe(10);
      expect(mockInventoryRepo.upsertLocationInventory).toHaveBeenCalledTimes(10);
    });
  });
});

