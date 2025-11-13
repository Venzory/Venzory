/**
 * Receiving Service Integration Tests
 * Tests transaction boundaries with real database to verify rollback behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { ReceivingService } from '@/src/services/receiving/receiving-service';
import { ReceivingRepository } from '@/src/repositories/receiving';
import { InventoryRepository } from '@/src/repositories/inventory';
import { UserRepository } from '@/src/repositories/users';
import { OrderRepository } from '@/src/repositories/orders';
import { AuditService } from '@/src/services/audit/audit-service';
import { AuditRepository } from '@/src/repositories/audit';
import type { RequestContext } from '@/src/lib/context/request-context';
import { BusinessRuleViolationError } from '@/src/domain/errors';

describe('Receiving Service - Transaction Integration Tests', () => {
  let service: ReceivingService;
  let testPracticeId: string;
  let testUserId: string;
  let testLocationId: string;
  let testItemId: string;
  let testProductId: string;
  let testSupplierId: string;
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

    const supplier = await prisma.supplier.create({
      data: {
        practiceId: testPracticeId,
        name: 'Test Supplier',
      },
    });
    testSupplierId = supplier.id;

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

    ctx = {
      userId: testUserId,
      userEmail: `test-${Date.now()}@test.com`,
      userName: 'Test User',
      practiceId: testPracticeId,
      role: 'STAFF',
      memberships: [],
      timestamp: new Date(),
      requestId: 'test-req',
    };

    // Create service with real repositories
    service = new ReceivingService(
      new ReceivingRepository(),
      new InventoryRepository(),
      new UserRepository(),
      new OrderRepository(),
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
    await prisma.goodsReceiptLine.deleteMany({
      where: { receipt: { practiceId: testPracticeId } },
    });
    await prisma.goodsReceipt.deleteMany({
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
    await prisma.supplier.deleteMany({
      where: { practiceId: testPracticeId },
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

  describe('confirmGoodsReceipt - Happy Path', () => {
    it('should commit all changes when receipt confirmation succeeds', async () => {
      // Create a draft receipt with one line
      const receipt = await prisma.goodsReceipt.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          supplierId: testSupplierId,
          status: 'DRAFT',
          createdById: testUserId,
          lines: {
            create: {
              itemId: testItemId,
              quantity: 5,
              batchNumber: 'BATCH-001',
            },
          },
        },
      });

      // Confirm the receipt
      const result = await service.confirmGoodsReceipt(ctx, receipt.id);

      // Verify result
      expect(result.receiptId).toBe(receipt.id);
      expect(result.linesProcessed).toBe(1);
      expect(result.inventoryUpdated).toBe(true);

      // Verify receipt status updated
      const updatedReceipt = await prisma.goodsReceipt.findUnique({
        where: { id: receipt.id },
      });
      expect(updatedReceipt?.status).toBe('CONFIRMED');
      expect(updatedReceipt?.receivedAt).toBeTruthy();

      // Verify inventory updated
      const inventory = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItemId,
          },
        },
      });
      expect(inventory?.quantity).toBe(15); // 10 + 5

      // Verify stock adjustment created
      const adjustments = await prisma.stockAdjustment.findMany({
        where: {
          practiceId: testPracticeId,
          itemId: testItemId,
        },
      });
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].quantity).toBe(5);
      expect(adjustments[0].reason).toBe('Goods Receipt');

      // Verify audit log created
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          practiceId: testPracticeId,
          entityType: 'GoodsReceipt',
          entityId: receipt.id,
          action: 'CONFIRMED',
        },
      });
      expect(auditLogs).toHaveLength(1);
    });
  });

  describe('confirmGoodsReceipt - Rollback on Business Rule Violation', () => {
    it('should rollback all changes when receipt is already confirmed', async () => {
      // Create a confirmed receipt
      const receipt = await prisma.goodsReceipt.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          supplierId: testSupplierId,
          status: 'CONFIRMED',
          receivedAt: new Date(),
          createdById: testUserId,
          lines: {
            create: {
              itemId: testItemId,
              quantity: 5,
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

      // Try to confirm again - should fail
      await expect(service.confirmGoodsReceipt(ctx, receipt.id)).rejects.toThrow(
        BusinessRuleViolationError
      );

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

      // Verify no new stock adjustments created
      const adjustments = await prisma.stockAdjustment.findMany({
        where: {
          practiceId: testPracticeId,
        },
      });
      expect(adjustments).toHaveLength(0);

      // Verify no new audit logs for CONFIRMED action
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          practiceId: testPracticeId,
          entityType: 'GoodsReceipt',
          action: 'CONFIRMED',
        },
      });
      expect(auditLogs).toHaveLength(0);
    });
  });

  describe('confirmGoodsReceipt - Rollback on Empty Receipt', () => {
    it('should rollback when receipt has no lines', async () => {
      // Create a draft receipt without lines
      const receipt = await prisma.goodsReceipt.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          supplierId: testSupplierId,
          status: 'DRAFT',
          createdById: testUserId,
        },
      });

      // Try to confirm - should fail validation
      await expect(service.confirmGoodsReceipt(ctx, receipt.id)).rejects.toThrow();

      // Verify receipt status unchanged
      const updatedReceipt = await prisma.goodsReceipt.findUnique({
        where: { id: receipt.id },
      });
      expect(updatedReceipt?.status).toBe('DRAFT');
      expect(updatedReceipt?.receivedAt).toBeNull();

      // Verify no stock adjustments created
      const adjustments = await prisma.stockAdjustment.findMany({
        where: {
          practiceId: testPracticeId,
        },
      });
      expect(adjustments).toHaveLength(0);
    });
  });

  describe('confirmGoodsReceipt - Multiple Lines Transaction Atomicity', () => {
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

      // Create receipt with multiple lines
      const receipt = await prisma.goodsReceipt.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          supplierId: testSupplierId,
          status: 'DRAFT',
          createdById: testUserId,
          lines: {
            create: [
              { itemId: testItemId, quantity: 5 },
              { itemId: item2.id, quantity: 10 },
            ],
          },
        },
      });

      // Confirm receipt
      await service.confirmGoodsReceipt(ctx, receipt.id);

      // Verify both inventory records updated
      const inventory1 = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItemId,
          },
        },
      });
      expect(inventory1?.quantity).toBe(15); // 10 + 5

      const inventory2 = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: item2.id,
          },
        },
      });
      expect(inventory2?.quantity).toBe(30); // 20 + 10

      // Verify both stock adjustments created
      const adjustments = await prisma.stockAdjustment.findMany({
        where: {
          practiceId: testPracticeId,
        },
        orderBy: { createdAt: 'asc' },
      });
      expect(adjustments).toHaveLength(2);
      expect(adjustments[0].quantity).toBe(5);
      expect(adjustments[1].quantity).toBe(10);
    });
  });
});

