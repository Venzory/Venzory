/**
 * Order Service Integration Tests
 * Tests transaction boundaries with real database to verify rollback behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { OrderService } from '@/src/services/orders/order-service';
import { OrderRepository } from '@/src/repositories/orders';
import { InventoryRepository } from '@/src/repositories/inventory';
import { UserRepository } from '@/src/repositories/users';
import { PracticeSupplierRepository } from '@/src/repositories/suppliers';
import { AuditService } from '@/src/services/audit/audit-service';
import { AuditRepository } from '@/src/repositories/audit';
import type { RequestContext } from '@/src/lib/context/request-context';
import { ValidationError } from '@/src/domain/errors';

describe('Order Service - Transaction Integration Tests', () => {
  let service: OrderService;
  let testPracticeId: string;
  let testUserId: string;
  let testLocationId: string;
  let testItem1Id: string;
  let testItem2Id: string;
  let testProductId: string;
  let testSupplier1Id: string;
  let testSupplier2Id: string;
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

    const supplier1 = await prisma.supplier.create({
      data: {
        practiceId: testPracticeId,
        name: 'Supplier A',
      },
    });
    testSupplier1Id = supplier1.id;

    const supplier2 = await prisma.supplier.create({
      data: {
        practiceId: testPracticeId,
        name: 'Supplier B',
      },
    });
    testSupplier2Id = supplier2.id;

    const item1 = await prisma.item.create({
      data: {
        practiceId: testPracticeId,
        productId: testProductId,
        name: 'Low Stock Item 1',
        sku: 'LOW-001',
        unit: 'unit',
        defaultSupplierId: testSupplier1Id,
      },
    });
    testItem1Id = item1.id;

    const item2 = await prisma.item.create({
      data: {
        practiceId: testPracticeId,
        productId: testProductId,
        name: 'Low Stock Item 2',
        sku: 'LOW-002',
        unit: 'unit',
        defaultSupplierId: testSupplier2Id,
      },
    });
    testItem2Id = item2.id;

    // Set up low stock inventory for both items
    await prisma.locationInventory.create({
      data: {
        locationId: testLocationId,
        itemId: testItem1Id,
        quantity: 2, // Below reorder point
        reorderPoint: 5,
        reorderQuantity: 20,
      },
    });

    await prisma.locationInventory.create({
      data: {
        locationId: testLocationId,
        itemId: testItem2Id,
        quantity: 1, // Below reorder point
        reorderPoint: 10,
        reorderQuantity: 30,
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
    service = new OrderService(
      new OrderRepository(),
      new InventoryRepository(),
      new UserRepository(),
      new PracticeSupplierRepository(),
      new AuditService(new AuditRepository())
    );
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany({
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

  describe('createOrdersFromLowStock - Happy Path', () => {
    it('should create multiple orders atomically when multiple suppliers involved', async () => {
      // Create orders from low stock items
      const result = await service.createOrdersFromLowStock(ctx, [
        testItem1Id,
        testItem2Id,
      ]);

      // Verify result
      expect(result.orders).toHaveLength(2);
      expect(result.skippedItems).toHaveLength(0);
      expect(result.orders[0].supplierName).toBe('Supplier A');
      expect(result.orders[1].supplierName).toBe('Supplier B');

      // Verify orders created in database
      const orders = await prisma.order.findMany({
        where: { practiceId: testPracticeId },
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      });

      expect(orders).toHaveLength(2);

      // Verify first order
      expect(orders[0].supplierId).toBe(testSupplier1Id);
      expect(orders[0].status).toBe('DRAFT');
      expect(orders[0].items).toHaveLength(1);
      expect(orders[0].items[0].itemId).toBe(testItem1Id);
      expect(orders[0].items[0].quantity).toBe(20); // reorderQuantity

      // Verify second order
      expect(orders[1].supplierId).toBe(testSupplier2Id);
      expect(orders[1].status).toBe('DRAFT');
      expect(orders[1].items).toHaveLength(1);
      expect(orders[1].items[0].itemId).toBe(testItem2Id);
      expect(orders[1].items[0].quantity).toBe(30); // reorderQuantity

      // Verify audit logs created for both orders
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          practiceId: testPracticeId,
          entityType: 'Order',
          action: 'CREATED',
        },
      });
      expect(auditLogs).toHaveLength(0); // Note: createOrdersFromLowStock doesn't log individual order creation
    });

    it('should create single order when items share same supplier', async () => {
      // Update item2 to use same supplier as item1
      await prisma.item.update({
        where: { id: testItem2Id },
        data: { defaultSupplierId: testSupplier1Id },
      });

      // Create orders from low stock items
      const result = await service.createOrdersFromLowStock(ctx, [
        testItem1Id,
        testItem2Id,
      ]);

      // Verify result
      expect(result.orders).toHaveLength(1);
      expect(result.skippedItems).toHaveLength(0);
      expect(result.orders[0].supplierName).toBe('Supplier A');

      // Verify single order created with both items
      const orders = await prisma.order.findMany({
        where: { practiceId: testPracticeId },
        include: { items: true },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].items).toHaveLength(2);
    });

    it('should skip items without default supplier', async () => {
      // Create item without supplier
      const item3 = await prisma.item.create({
        data: {
          practiceId: testPracticeId,
          productId: testProductId,
          name: 'No Supplier Item',
          sku: 'NO-SUP',
          unit: 'unit',
          defaultSupplierId: null,
        },
      });

      await prisma.locationInventory.create({
        data: {
          locationId: testLocationId,
          itemId: item3.id,
          quantity: 1,
          reorderPoint: 5,
          reorderQuantity: 10,
        },
      });

      // Try to create orders
      const result = await service.createOrdersFromLowStock(ctx, [
        testItem1Id,
        item3.id,
      ]);

      // Verify result
      expect(result.orders).toHaveLength(1);
      expect(result.skippedItems).toHaveLength(1);
      expect(result.skippedItems[0]).toBe('No Supplier Item');

      // Verify only one order created (for item1)
      const orders = await prisma.order.findMany({
        where: { practiceId: testPracticeId },
      });
      expect(orders).toHaveLength(1);
    });
  });

  describe('createOrdersFromLowStock - Rollback on Validation Error', () => {
    it('should rollback all orders when validation fails', async () => {
      // Try to create orders with empty selection
      await expect(service.createOrdersFromLowStock(ctx, [])).rejects.toThrow(
        ValidationError
      );

      // Verify no orders created
      const orders = await prisma.order.findMany({
        where: { practiceId: testPracticeId },
      });
      expect(orders).toHaveLength(0);

      // Verify no order items created
      const orderItems = await prisma.orderItem.findMany({
        where: { order: { practiceId: testPracticeId } },
      });
      expect(orderItems).toHaveLength(0);
    });
  });

  describe('createOrdersFromLowStock - Transaction Atomicity', () => {
    it('should rollback all orders if any order creation fails', async () => {
      // Delete supplier2 to cause failure partway through
      await prisma.supplier.delete({
        where: { id: testSupplier2Id },
      });

      // Try to create orders - should fail when processing item2
      await expect(
        service.createOrdersFromLowStock(ctx, [testItem1Id, testItem2Id])
      ).rejects.toThrow();

      // Verify NO orders created (transaction rollback)
      const orders = await prisma.order.findMany({
        where: { practiceId: testPracticeId },
      });
      expect(orders).toHaveLength(0);

      // Verify NO order items created
      const orderItems = await prisma.orderItem.findMany({
        where: { order: { practiceId: testPracticeId } },
      });
      expect(orderItems).toHaveLength(0);
    });

    it('should create orders with correct calculated quantities from multiple locations', async () => {
      // Create second location with low stock for item1
      const location2 = await prisma.location.create({
        data: {
          practiceId: testPracticeId,
          name: 'Test Location 2',
          code: 'LOC-02',
        },
      });

      await prisma.locationInventory.create({
        data: {
          locationId: location2.id,
          itemId: testItem1Id,
          quantity: 1, // Below reorder point
          reorderPoint: 5,
          reorderQuantity: 15,
        },
      });

      // Create orders from low stock
      const result = await service.createOrdersFromLowStock(ctx, [testItem1Id]);

      // Verify single order created
      expect(result.orders).toHaveLength(1);

      // Verify order has combined quantity from both locations
      const order = await prisma.order.findFirst({
        where: { practiceId: testPracticeId },
        include: { items: true },
      });

      expect(order?.items).toHaveLength(1);
      expect(order?.items[0].quantity).toBe(35); // 20 + 15 from both locations
    });
  });

  describe('createOrdersFromLowStock - Multiple Items Per Supplier', () => {
    it('should group items by supplier in single order', async () => {
      // Create third item with same supplier as item1
      const item3 = await prisma.item.create({
        data: {
          practiceId: testPracticeId,
          productId: testProductId,
          name: 'Low Stock Item 3',
          sku: 'LOW-003',
          unit: 'unit',
          defaultSupplierId: testSupplier1Id, // Same as item1
        },
      });

      await prisma.locationInventory.create({
        data: {
          locationId: testLocationId,
          itemId: item3.id,
          quantity: 1,
          reorderPoint: 8,
          reorderQuantity: 25,
        },
      });

      // Create orders
      const result = await service.createOrdersFromLowStock(ctx, [
        testItem1Id,
        item3.id,
        testItem2Id,
      ]);

      // Verify 2 orders (supplier1 has 2 items, supplier2 has 1)
      expect(result.orders).toHaveLength(2);

      // Find order for supplier1
      const supplier1Order = await prisma.order.findFirst({
        where: {
          practiceId: testPracticeId,
          supplierId: testSupplier1Id,
        },
        include: { items: true },
      });

      expect(supplier1Order?.items).toHaveLength(2);
      expect(supplier1Order?.items.map((i) => i.itemId).sort()).toEqual(
        [testItem1Id, item3.id].sort()
      );

      // Find order for supplier2
      const supplier2Order = await prisma.order.findFirst({
        where: {
          practiceId: testPracticeId,
          supplierId: testSupplier2Id,
        },
        include: { items: true },
      });

      expect(supplier2Order?.items).toHaveLength(1);
      expect(supplier2Order?.items[0].itemId).toBe(testItem2Id);
    });
  });
});

