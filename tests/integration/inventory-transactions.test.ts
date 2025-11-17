/**
 * Inventory Service Integration Tests
 * Tests transaction boundaries with real database to verify rollback behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { InventoryService } from '@/src/services/inventory/inventory-service';
import { InventoryRepository } from '@/src/repositories/inventory';
import { ProductRepository } from '@/src/repositories/products';
import { LocationRepository } from '@/src/repositories/locations';
import { StockCountRepository } from '@/src/repositories/stock-count';
import { UserRepository } from '@/src/repositories/users';
import { AuditService } from '@/src/services/audit/audit-service';
import { AuditRepository } from '@/src/repositories/audit';
import type { RequestContext } from '@/src/lib/context/request-context';
import { createTestContext } from '@/src/lib/context/request-context';
import { BusinessRuleViolationError, ConcurrencyError } from '@/src/domain/errors';

// Mock the notification check
vi.mock('@/lib/notifications', () => ({
  checkAndCreateLowStockNotification: vi.fn(),
}));

describe('Inventory Service - Transaction Integration Tests', () => {
  let service: InventoryService;
  let testPracticeId: string;
  let testUserId: string;
  let testLocationId: string;
  let testItemId: string;
  let testProductId: string;
  let ctx: RequestContext;

  beforeEach(async () => {
    // Create test data in database
    const practice = await prisma.practice.create({
      data: {
        name: 'Test Practice',
        slug: `test-practice-${Date.now()}`,
      },
    });
    testPracticeId = practice.id;

    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@test.com`,
        name: 'Test User',
        passwordHash: 'test',
        memberships: {
          create: {
            practiceId: testPracticeId,
            role: 'STAFF',
            status: 'ACTIVE',
            invitedAt: new Date(),
            acceptedAt: new Date(),
          },
        },
      },
    });
    testUserId = user.id;

    const location = await prisma.location.create({
      data: {
        practiceId: testPracticeId,
        name: 'Test Location',
        code: 'LOC-01',
      },
    });
    testLocationId = location.id;

    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        isGs1Product: false,
      },
    });
    testProductId = product.id;

    const item = await prisma.item.create({
      data: {
        practiceId: testPracticeId,
        productId: testProductId,
        name: 'Test Item',
        sku: 'TEST-001',
        unit: 'unit',
      },
    });
    testItemId = item.id;

    // Set up initial inventory
    await prisma.locationInventory.create({
      data: {
        locationId: testLocationId,
        itemId: testItemId,
        quantity: 10,
        reorderPoint: 5,
        reorderQuantity: 20,
      },
    });

    ctx = createTestContext({
      userId: testUserId,
      practiceId: testPracticeId,
      role: 'STAFF',
    });

    // Create service with real repositories
    service = new InventoryService(
      new InventoryRepository(),
      new ProductRepository(),
      new LocationRepository(),
      new StockCountRepository(),
      new UserRepository(),
      new AuditService(new AuditRepository())
    );
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany({
      where: { practiceId: testPracticeId },
    });
    await prisma.stockAdjustment.deleteMany({
      where: { practiceId: testPracticeId },
    });
    await prisma.stockCountLine.deleteMany({
      where: { session: { practiceId: testPracticeId } },
    });
    await prisma.stockCountSession.deleteMany({
      where: { practiceId: testPracticeId },
    });
    await prisma.locationInventory.deleteMany({
      where: { location: { practiceId: testPracticeId } },
    });
    await prisma.item.deleteMany({
      where: { practiceId: testPracticeId },
    });
    await prisma.product.deleteMany({
      where: { id: testProductId },
    });
    await prisma.location.deleteMany({
      where: { practiceId: testPracticeId },
    });
    await prisma.practiceUser.deleteMany({
      where: { practiceId: testPracticeId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await prisma.practice.deleteMany({
      where: { id: testPracticeId },
    });
  });

  describe('completeStockCount - Happy Path', () => {
    it('should commit all changes when stock count completes successfully', async () => {
      // Create stock count session with a counted line
      const session = await prisma.stockCountSession.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          status: 'IN_PROGRESS',
          createdById: testUserId,
          lines: {
            create: {
              itemId: testItemId,
              countedQuantity: 8,
              systemQuantity: 10,
              variance: -2,
            },
          },
        },
      });

      // Complete the count and apply adjustments
      const result = await service.completeStockCount(ctx, session.id, true, false);

      // Verify result
      expect(result.adjustedItems).toBe(1);

      // Verify session status updated
      const updatedSession = await prisma.stockCountSession.findUnique({
        where: { id: session.id },
      });
      expect(updatedSession?.status).toBe('COMPLETED');
      expect(updatedSession?.completedAt).toBeTruthy();

      // Verify inventory updated to counted quantity
      const inventory = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItemId,
          },
        },
      });
      expect(inventory?.quantity).toBe(8); // Set to counted quantity

      // Verify stock adjustment created
      const adjustments = await prisma.stockAdjustment.findMany({
        where: {
          practiceId: testPracticeId,
          itemId: testItemId,
        },
      });
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantity).toBe(-2);
      expect(adjustments[0].reason).toBe('Stock Count');

      // Verify audit log created
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          practiceId: testPracticeId,
          entityType: 'StockCountSession',
          entityId: session.id,
          action: 'COMPLETED',
        },
      });
      expect(auditLogs).toHaveLength(1);
    });

    it('should complete without adjustments (view-only mode)', async () => {
      // Create stock count session
      const session = await prisma.stockCountSession.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          status: 'IN_PROGRESS',
          createdById: testUserId,
          lines: {
            create: {
              itemId: testItemId,
              countedQuantity: 8,
              systemQuantity: 10,
              variance: -2,
            },
          },
        },
      });

      // Complete without applying adjustments
      const result = await service.completeStockCount(ctx, session.id, false, false);

      // Verify result
      expect(result.adjustedItems).toBe(0);

      // Verify session marked complete
      const updatedSession = await prisma.stockCountSession.findUnique({
        where: { id: session.id },
      });
      expect(updatedSession?.status).toBe('COMPLETED');

      // Verify inventory unchanged
      const inventory = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItemId,
          },
        },
      });
      expect(inventory?.quantity).toBe(10); // Original quantity

      // Verify no stock adjustments created
      const adjustments = await prisma.stockAdjustment.findMany({
        where: {
          practiceId: testPracticeId,
        },
      });
      expect(adjustments).toHaveLength(0);
    });
  });

  describe('completeStockCount - Rollback on Business Rule Violation', () => {
    it('should rollback when count would result in negative inventory', async () => {
      // Create stock count with a line that would make inventory negative
      const session = await prisma.stockCountSession.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          status: 'IN_PROGRESS',
          createdById: testUserId,
          lines: {
            create: {
              itemId: testItemId,
              countedQuantity: -5, // Invalid negative count
              systemQuantity: 10,
              variance: -15,
            },
          },
        },
      });

      const initialInventory = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItemId,
          },
        },
      });

      // Try to complete - should fail
      await expect(
        service.completeStockCount(ctx, session.id, true, false)
      ).rejects.toThrow(BusinessRuleViolationError);

      // Verify session status unchanged
      const sessionAfter = await prisma.stockCountSession.findUnique({
        where: { id: session.id },
      });
      expect(sessionAfter?.status).toBe('IN_PROGRESS');
      expect(sessionAfter?.completedAt).toBeNull();

      // Verify inventory unchanged
      const inventory = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItemId,
          },
        },
      });
      expect(inventory?.quantity).toBe(initialInventory?.quantity);

      // Verify no stock adjustments created
      const adjustments = await prisma.stockAdjustment.findMany({
        where: {
          practiceId: testPracticeId,
        },
      });
      expect(adjustments).toHaveLength(0);

      // Verify no audit log for COMPLETED action
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          practiceId: testPracticeId,
          entityType: 'StockCountSession',
          action: 'COMPLETED',
        },
      });
      expect(auditLogs).toHaveLength(0);
    });

    it('should rollback when session is already completed', async () => {
      // Create completed session
      const session = await prisma.stockCountSession.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          status: 'COMPLETED',
          completedAt: new Date(),
          createdById: testUserId,
          lines: {
            create: {
              itemId: testItemId,
              countedQuantity: 8,
              systemQuantity: 10,
              variance: -2,
            },
          },
        },
      });

      // Try to complete again - should fail
      await expect(
        service.completeStockCount(ctx, session.id, true, false)
      ).rejects.toThrow(BusinessRuleViolationError);

      // Verify no additional changes made
      const adjustments = await prisma.stockAdjustment.findMany({
        where: {
          practiceId: testPracticeId,
        },
      });
      expect(adjustments).toHaveLength(0);
    });
  });

  describe('completeStockCount - Concurrency Detection', () => {
    it('should detect concurrent inventory changes and block without override', async () => {
      // Create stock count session
      const session = await prisma.stockCountSession.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          status: 'IN_PROGRESS',
          createdById: testUserId,
          lines: {
            create: {
              itemId: testItemId,
              countedQuantity: 8,
              systemQuantity: 10,
              variance: -2,
            },
          },
        },
      });

      // Simulate concurrent inventory change
      await prisma.locationInventory.update({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItemId,
          },
        },
        data: { quantity: 12 }, // Changed from 10 to 12
      });

      // Try to complete - should fail due to concurrency
      await expect(
        service.completeStockCount(ctx, session.id, true, false)
      ).rejects.toThrow(ConcurrencyError);

      // Verify session not completed
      const sessionAfter = await prisma.stockCountSession.findUnique({
        where: { id: session.id },
      });
      expect(sessionAfter?.status).toBe('IN_PROGRESS');

      // Verify no stock adjustments created
      const adjustments = await prisma.stockAdjustment.findMany({
        where: {
          practiceId: testPracticeId,
        },
      });
      expect(adjustments).toHaveLength(0);
    });

    it('should allow ADMIN to override concurrency detection', async () => {
      // Create admin context
      const adminCtx: RequestContext = {
        ...ctx,
        role: 'ADMIN',
      };

      // Create stock count session
      const session = await prisma.stockCountSession.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          status: 'IN_PROGRESS',
          createdById: testUserId,
          lines: {
            create: {
              itemId: testItemId,
              countedQuantity: 8,
              systemQuantity: 10,
              variance: -2,
            },
          },
        },
      });

      // Simulate concurrent inventory change
      await prisma.locationInventory.update({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItemId,
          },
        },
        data: { quantity: 12 },
      });

      // Complete with admin override
      const result = await service.completeStockCount(adminCtx, session.id, true, true);

      // Verify completion with warnings
      expect(result.adjustedItems).toBe(1);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0]).toContain('System quantity changed');

      // Verify inventory set to counted quantity
      const inventory = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItemId,
          },
        },
      });
      expect(inventory?.quantity).toBe(8);

      // Verify stock adjustment created
      const adjustments = await prisma.stockAdjustment.findMany({
        where: {
          practiceId: testPracticeId,
        },
      });
      expect(adjustments).toHaveLength(1);
    });
  });

  describe('completeStockCount - Multiple Lines Transaction Atomicity', () => {
    it('should update inventory for all lines atomically', async () => {
      // Create second item
      const item2 = await prisma.item.create({
        data: {
          practiceId: testPracticeId,
          productId: testProductId,
          name: 'Test Item 2',
          sku: 'TEST-002',
          unit: 'unit',
        },
      });

      await prisma.locationInventory.create({
        data: {
          locationId: testLocationId,
          itemId: item2.id,
          quantity: 20,
        },
      });

      // Create stock count with multiple lines
      const session = await prisma.stockCountSession.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          status: 'IN_PROGRESS',
          createdById: testUserId,
          lines: {
            create: [
              {
                itemId: testItemId,
                countedQuantity: 8,
                systemQuantity: 10,
                variance: -2,
              },
              {
                itemId: item2.id,
                countedQuantity: 25,
                systemQuantity: 20,
                variance: 5,
              },
            ],
          },
        },
      });

      // Complete count
      const result = await service.completeStockCount(ctx, session.id, true, false);

      expect(result.adjustedItems).toBe(2);

      // Verify both inventory records updated
      const inventory1 = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItemId,
          },
        },
      });
      expect(inventory1?.quantity).toBe(8);

      const inventory2 = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: item2.id,
          },
        },
      });
      expect(inventory2?.quantity).toBe(25);

      // Verify both stock adjustments created
      const adjustments = await prisma.stockAdjustment.findMany({
        where: {
          practiceId: testPracticeId,
        },
        orderBy: { createdAt: 'asc' },
      });
      expect(adjustments).toHaveLength(2);
      expect(adjustments[0].quantity).toBe(-2);
      expect(adjustments[1].quantity).toBe(5);
    });
  });
});

