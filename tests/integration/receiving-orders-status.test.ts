/**
 * Receiving Service - Order Status Integration Tests
 * Tests order-linked receiving and status transitions (SENT → PARTIALLY_RECEIVED → RECEIVED)
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
import { createTestContext } from '@/src/lib/context/request-context';

describe('Receiving Service - Order Status Transitions', () => {
  let service: ReceivingService;
  let testPracticeId: string;
  let testUserId: string;
  let testLocationId: string;
  let testItem1Id: string;
  let testItem2Id: string;
  let testProductId: string;
  let testSupplierId: string;
  let testGlobalSupplierId: string;
  let testPracticeSupplierId: string;
  let testOrderId: string;
  let ctx: RequestContext;

  beforeEach(async () => {
    // Create test data
    const practice = await prisma.practice.create({
      data: {
        name: 'Test Practice',
        slug: `test-practice-order-status-${Date.now()}`,
      },
    });
    testPracticeId = practice.id;

    const user = await prisma.user.create({
      data: {
        email: `test-order-status-${Date.now()}@test.com`,
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

    const item1 = await prisma.item.create({
      data: {
        practiceId: testPracticeId,
        productId: testProductId,
        name: 'Test Item 1',
        sku: 'TEST-001',
        unit: 'unit',
      },
    });
    testItem1Id = item1.id;

    const item2 = await prisma.item.create({
      data: {
        practiceId: testPracticeId,
        productId: testProductId,
        name: 'Test Item 2',
        sku: 'TEST-002',
        unit: 'unit',
      },
    });
    testItem2Id = item2.id;

    const supplier = await prisma.supplier.create({
      data: {
        practiceId: testPracticeId,
        name: 'Test Supplier',
      },
    });
    testSupplierId = supplier.id;

    // Create GlobalSupplier and PracticeSupplier
    const globalSupplier = await prisma.globalSupplier.create({
      data: {
        name: 'Global Test Supplier',
      },
    });
    testGlobalSupplierId = globalSupplier.id;

    const practiceSupplier = await prisma.practiceSupplier.create({
      data: {
        practiceId: testPracticeId,
        globalSupplierId: testGlobalSupplierId,
        migratedFromSupplierId: testSupplierId,
      },
    });
    testPracticeSupplierId = practiceSupplier.id;

    // Create an order with two items
    const order = await prisma.order.create({
      data: {
        practiceId: testPracticeId,
        practiceSupplierId: testPracticeSupplierId,
        status: 'SENT',
        reference: 'TEST-ORDER-001',
        createdById: testUserId,
        items: {
          create: [
            {
              itemId: testItem1Id,
              quantity: 10,
            },
            {
              itemId: testItem2Id,
              quantity: 20,
            },
          ],
        },
      },
    });
    testOrderId = order.id;

    // Set up initial inventory
    await prisma.locationInventory.createMany({
      data: [
        {
          locationId: testLocationId,
          itemId: testItem1Id,
          quantity: 5,
        },
        {
          locationId: testLocationId,
          itemId: testItem2Id,
          quantity: 10,
        },
      ],
    });

    ctx = createTestContext({
      userId: testUserId,
      practiceId: testPracticeId,
      role: 'STAFF',
    });

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
    await prisma.orderItem.deleteMany({
      where: { order: { practiceId: testPracticeId } },
    });
    await prisma.order.deleteMany({
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
    await prisma.practiceSupplier.deleteMany({
      where: { practiceId: testPracticeId },
    });
    await prisma.supplier.deleteMany({
      where: { practiceId: testPracticeId },
    });
    await prisma.globalSupplier.deleteMany({
      where: { id: testGlobalSupplierId },
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

  describe('Order Status: SENT → PARTIALLY_RECEIVED', () => {
    it('should set order status to PARTIALLY_RECEIVED when only some items are received', async () => {
      // Create a receipt linked to the order
      const receipt = await service.createGoodsReceipt(ctx, {
        locationId: testLocationId,
        orderId: testOrderId,
        supplierId: testSupplierId,
        notes: 'Partial delivery',
      });

      // Add only one item (partial fulfillment)
      await service.addReceiptLine(ctx, receipt.id, {
        itemId: testItem1Id,
        quantity: 10, // Full quantity for item 1
      });

      // Confirm the receipt
      const result = await service.confirmGoodsReceipt(ctx, receipt.id);

      // Verify result
      expect(result.receiptId).toBe(receipt.id);
      expect(result.orderId).toBe(testOrderId);
      expect(result.inventoryUpdated).toBe(true);

      // Verify order status is PARTIALLY_RECEIVED
      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrderId },
      });
      expect(updatedOrder?.status).toBe('PARTIALLY_RECEIVED');

      // Verify inventory updated for item 1
      const inventory1 = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItem1Id,
          },
        },
      });
      expect(inventory1?.quantity).toBe(15); // 5 + 10

      // Verify inventory unchanged for item 2
      const inventory2 = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItem2Id,
          },
        },
      });
      expect(inventory2?.quantity).toBe(10); // Unchanged
    });
  });

  describe('Order Status: PARTIALLY_RECEIVED → RECEIVED', () => {
    it('should set order status to RECEIVED when all items are fully received across multiple receipts', async () => {
      // First receipt: partial delivery
      const receipt1 = await service.createGoodsReceipt(ctx, {
        locationId: testLocationId,
        orderId: testOrderId,
        supplierId: testSupplierId,
        notes: 'First delivery',
      });

      await service.addReceiptLine(ctx, receipt1.id, {
        itemId: testItem1Id,
        quantity: 10,
      });

      await service.confirmGoodsReceipt(ctx, receipt1.id);

      // Verify order is PARTIALLY_RECEIVED
      let order = await prisma.order.findUnique({
        where: { id: testOrderId },
      });
      expect(order?.status).toBe('PARTIALLY_RECEIVED');

      // Second receipt: complete remaining items
      const receipt2 = await service.createGoodsReceipt(ctx, {
        locationId: testLocationId,
        orderId: testOrderId,
        supplierId: testSupplierId,
        notes: 'Second delivery',
      });

      await service.addReceiptLine(ctx, receipt2.id, {
        itemId: testItem2Id,
        quantity: 20, // Full quantity for item 2
      });

      await service.confirmGoodsReceipt(ctx, receipt2.id);

      // Verify order status is now RECEIVED
      order = await prisma.order.findUnique({
        where: { id: testOrderId },
      });
      expect(order?.status).toBe('RECEIVED');

      // Verify all inventory updated
      const inventory1 = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItem1Id,
          },
        },
      });
      expect(inventory1?.quantity).toBe(15); // 5 + 10

      const inventory2 = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItem2Id,
          },
        },
      });
      expect(inventory2?.quantity).toBe(30); // 10 + 20
    });
  });

  describe('Order Status: SENT → RECEIVED (single receipt)', () => {
    it('should set order status directly to RECEIVED when all items are received in one receipt', async () => {
      // Create a receipt with all items
      const receipt = await service.createGoodsReceipt(ctx, {
        locationId: testLocationId,
        orderId: testOrderId,
        supplierId: testSupplierId,
        notes: 'Complete delivery',
      });

      // Add all items
      await service.addReceiptLine(ctx, receipt.id, {
        itemId: testItem1Id,
        quantity: 10,
      });

      await service.addReceiptLine(ctx, receipt.id, {
        itemId: testItem2Id,
        quantity: 20,
      });

      // Confirm the receipt
      await service.confirmGoodsReceipt(ctx, receipt.id);

      // Verify order status is RECEIVED
      const order = await prisma.order.findUnique({
        where: { id: testOrderId },
      });
      expect(order?.status).toBe('RECEIVED');

      // Verify all inventory updated
      const inventory1 = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItem1Id,
          },
        },
      });
      expect(inventory1?.quantity).toBe(15); // 5 + 10

      const inventory2 = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItem2Id,
          },
        },
      });
      expect(inventory2?.quantity).toBe(30); // 10 + 20

      // Verify stock adjustments created
      const adjustments = await prisma.stockAdjustment.findMany({
        where: {
          practiceId: testPracticeId,
        },
      });
      expect(adjustments).toHaveLength(2);
    });
  });

  describe('Over-receiving', () => {
    it('should still mark order as RECEIVED even when receiving more than ordered', async () => {
      // Create a receipt with over-delivery
      const receipt = await service.createGoodsReceipt(ctx, {
        locationId: testLocationId,
        orderId: testOrderId,
        supplierId: testSupplierId,
        notes: 'Over-delivery',
      });

      // Add more than ordered
      await service.addReceiptLine(ctx, receipt.id, {
        itemId: testItem1Id,
        quantity: 15, // Ordered 10, receiving 15
      });

      await service.addReceiptLine(ctx, receipt.id, {
        itemId: testItem2Id,
        quantity: 25, // Ordered 20, receiving 25
      });

      // Confirm the receipt
      await service.confirmGoodsReceipt(ctx, receipt.id);

      // Verify order status is RECEIVED (all items fulfilled, even if over)
      const order = await prisma.order.findUnique({
        where: { id: testOrderId },
      });
      expect(order?.status).toBe('RECEIVED');

      // Verify inventory reflects actual received quantities
      const inventory1 = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItem1Id,
          },
        },
      });
      expect(inventory1?.quantity).toBe(20); // 5 + 15

      const inventory2 = await prisma.locationInventory.findUnique({
        where: {
          locationId_itemId: {
            locationId: testLocationId,
            itemId: testItem2Id,
          },
        },
      });
      expect(inventory2?.quantity).toBe(35); // 10 + 25
    });
  });
});

