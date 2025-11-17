/**
 * Order Template Integration Tests
 * Tests template-based order creation with real database
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
import { createTestContext } from '@/src/lib/context/request-context';
import { ValidationError } from '@/src/domain/errors';

describe('Order Template Service - Integration Tests', () => {
  let service: OrderService;
  let testPracticeId: string;
  let testUserId: string;
  let testItem1Id: string;
  let testItem2Id: string;
  let testItem3Id: string;
  let testProductId: string;
  let testSupplier1Id: string;
  let testSupplier2Id: string;
  let testPracticeSupplier1Id: string;
  let testPracticeSupplier2Id: string;
  let testGlobalSupplier1Id: string;
  let testGlobalSupplier2Id: string;
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

    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        isGs1Product: false,
      },
    });
    testProductId = product.id;

    // Create legacy suppliers
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

    // Create GlobalSuppliers and PracticeSuppliers
    const globalSupplier1 = await prisma.globalSupplier.create({
      data: {
        name: 'Global Supplier A',
      },
    });
    testGlobalSupplier1Id = globalSupplier1.id;

    const globalSupplier2 = await prisma.globalSupplier.create({
      data: {
        name: 'Global Supplier B',
      },
    });
    testGlobalSupplier2Id = globalSupplier2.id;

    const practiceSupplier1 = await prisma.practiceSupplier.create({
      data: {
        practiceId: testPracticeId,
        globalSupplierId: testGlobalSupplier1Id,
        migratedFromSupplierId: testSupplier1Id,
      },
    });
    testPracticeSupplier1Id = practiceSupplier1.id;

    const practiceSupplier2 = await prisma.practiceSupplier.create({
      data: {
        practiceId: testPracticeId,
        globalSupplierId: testGlobalSupplier2Id,
        migratedFromSupplierId: testSupplier2Id,
      },
    });
    testPracticeSupplier2Id = practiceSupplier2.id;

    const item1 = await prisma.item.create({
      data: {
        practiceId: testPracticeId,
        productId: testProductId,
        name: 'Item 1',
        sku: 'ITEM-001',
        unit: 'unit',
        defaultSupplierId: testSupplier1Id,
        defaultPracticeSupplierId: testPracticeSupplier1Id,
      },
    });
    testItem1Id = item1.id;

    const item2 = await prisma.item.create({
      data: {
        practiceId: testPracticeId,
        productId: testProductId,
        name: 'Item 2',
        sku: 'ITEM-002',
        unit: 'unit',
        defaultSupplierId: testSupplier2Id,
        defaultPracticeSupplierId: testPracticeSupplier2Id,
      },
    });
    testItem2Id = item2.id;

    const item3 = await prisma.item.create({
      data: {
        practiceId: testPracticeId,
        productId: testProductId,
        name: 'Item 3 (No Supplier)',
        sku: 'ITEM-003',
        unit: 'unit',
        defaultSupplierId: null,
        defaultPracticeSupplierId: null,
      },
    });
    testItem3Id = item3.id;

    // Add supplier items for pricing
    await prisma.supplierItem.create({
      data: {
        supplierId: testSupplier1Id,
        practiceSupplierId: testPracticeSupplier1Id,
        itemId: testItem1Id,
        unitPrice: 10.50,
      },
    });

    await prisma.supplierItem.create({
      data: {
        supplierId: testSupplier2Id,
        practiceSupplierId: testPracticeSupplier2Id,
        itemId: testItem2Id,
        unitPrice: 5.75,
      },
    });

    ctx = createTestContext({
      userId: testUserId,
      practiceId: testPracticeId,
      role: 'STAFF',
    });

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
    await prisma.orderTemplateItem.deleteMany({
      where: { template: { practiceId: testPracticeId } },
    });
    await prisma.orderTemplate.deleteMany({
      where: { practiceId: testPracticeId },
    });
    await prisma.orderItem.deleteMany({
      where: { order: { practiceId: testPracticeId } },
    });
    await prisma.order.deleteMany({
      where: { practiceId: testPracticeId },
    });
    await prisma.supplierItem.deleteMany({
      where: { supplier: { practiceId: testPracticeId } },
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
    await prisma.globalSupplier.deleteMany({
      where: { 
        id: { 
          in: [testGlobalSupplier1Id, testGlobalSupplier2Id].filter(Boolean) 
        } 
      },
    });
    await prisma.supplier.deleteMany({
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

  describe('createOrdersFromTemplateWithDefaults', () => {
    it('should create orders from template with default quantities and suppliers', async () => {
      // Create template with items from different suppliers
      const template = await service.createTemplate(ctx, {
        name: 'Test Template',
        description: 'Multi-supplier template',
        items: [
          { itemId: testItem1Id, defaultQuantity: 10, supplierId: testSupplier1Id },
          { itemId: testItem2Id, defaultQuantity: 5, supplierId: testSupplier2Id },
        ],
      });

      // Create orders from template using defaults
      const result = await service.createOrdersFromTemplateWithDefaults(ctx, template.id);

      // Verify result
      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(2);
      expect(result.message).toContain('2 draft orders');

      // Verify orders in database
      const orders = await prisma.order.findMany({
        where: { practiceId: testPracticeId },
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      });

      expect(orders).toHaveLength(2);

      // Verify first order (PracticeSupplier A)
      const order1 = orders.find((o) => o.practiceSupplierId === testPracticeSupplier1Id);
      expect(order1).toBeDefined();
      expect(order1!.status).toBe('DRAFT');
      expect(order1!.items).toHaveLength(1);
      expect(order1!.items[0].itemId).toBe(testItem1Id);
      expect(order1!.items[0].quantity).toBe(10);
      expect(order1!.items[0].unitPrice?.toString()).toBe('10.50');

      // Verify second order (PracticeSupplier B)
      const order2 = orders.find((o) => o.practiceSupplierId === testPracticeSupplier2Id);
      expect(order2).toBeDefined();
      expect(order2!.status).toBe('DRAFT');
      expect(order2!.items).toHaveLength(1);
      expect(order2!.items[0].itemId).toBe(testItem2Id);
      expect(order2!.items[0].quantity).toBe(5);
      expect(order2!.items[0].unitPrice?.toString()).toBe('5.75');
    });

    it('should create single order when all items share same supplier', async () => {
      // Create template with items from same supplier
      const template = await service.createTemplate(ctx, {
        name: 'Single Supplier Template',
        description: null,
        items: [
          { itemId: testItem1Id, defaultQuantity: 10, supplierId: testSupplier1Id },
          { itemId: testItem2Id, defaultQuantity: 5, supplierId: testSupplier1Id },
        ],
      });

      // Create orders from template
      const result = await service.createOrdersFromTemplateWithDefaults(ctx, template.id);

      // Verify result
      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(1);
      expect(result.message).toContain('1 draft order');

      // Verify single order with both items
      const orders = await prisma.order.findMany({
        where: { practiceId: testPracticeId },
        include: { items: true },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].practiceSupplierId).toBe(testPracticeSupplier1Id);
      expect(orders[0].items).toHaveLength(2);
    });

    it('should skip items without supplier and create orders for valid items', async () => {
      // Create template with mix of items (some with suppliers, some without)
      const template = await service.createTemplate(ctx, {
        name: 'Mixed Template',
        description: null,
        items: [
          { itemId: testItem1Id, defaultQuantity: 10, supplierId: testSupplier1Id },
          { itemId: testItem3Id, defaultQuantity: 5, supplierId: null }, // No supplier
        ],
      });

      // Create orders from template
      const result = await service.createOrdersFromTemplateWithDefaults(ctx, template.id);

      // Verify result - should create order only for item with supplier
      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(1);

      // Verify only one order created
      const orders = await prisma.order.findMany({
        where: { practiceId: testPracticeId },
        include: { items: true },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].items).toHaveLength(1);
      expect(orders[0].items[0].itemId).toBe(testItem1Id);
    });

    it('should fail when template has no items', async () => {
      // Create empty template
      const template = await prisma.orderTemplate.create({
        data: {
          practiceId: testPracticeId,
          name: 'Empty Template',
          createdById: testUserId,
        },
      });

      // Try to create orders
      await expect(
        service.createOrdersFromTemplateWithDefaults(ctx, template.id)
      ).rejects.toThrow(ValidationError);
    });

    it('should fail when no items have valid suppliers', async () => {
      // Create template with only items without suppliers
      const template = await service.createTemplate(ctx, {
        name: 'No Suppliers Template',
        description: null,
        items: [{ itemId: testItem3Id, defaultQuantity: 5, supplierId: null }],
      });

      // Try to create orders
      await expect(
        service.createOrdersFromTemplateWithDefaults(ctx, template.id)
      ).rejects.toThrow(ValidationError);
    });

    it('should use item default supplier when template item has no explicit supplier', async () => {
      // Create template without explicit supplier (should use item's defaultSupplierId)
      const template = await service.createTemplate(ctx, {
        name: 'Default Supplier Template',
        description: null,
        items: [
          { itemId: testItem1Id, defaultQuantity: 10, supplierId: null }, // Will use item's default
        ],
      });

      // Create orders from template
      const result = await service.createOrdersFromTemplateWithDefaults(ctx, template.id);

      // Verify result
      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(1);

      // Verify order uses item's default supplier
      const orders = await prisma.order.findMany({
        where: { practiceId: testPracticeId },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].practiceSupplierId).toBe(testPracticeSupplier1Id); // Item1's default practice supplier
    });

    it('should handle template with multiple items per supplier', async () => {
      // Create additional item for supplier 1
      const item4 = await prisma.item.create({
        data: {
          practiceId: testPracticeId,
          productId: testProductId,
          name: 'Item 4',
          sku: 'ITEM-004',
          unit: 'unit',
          defaultSupplierId: testSupplier1Id,
        },
      });

      // Create template with multiple items for same supplier
      const template = await service.createTemplate(ctx, {
        name: 'Multi-Item Template',
        description: null,
        items: [
          { itemId: testItem1Id, defaultQuantity: 10, supplierId: testSupplier1Id },
          { itemId: item4.id, defaultQuantity: 20, supplierId: testSupplier1Id },
          { itemId: testItem2Id, defaultQuantity: 5, supplierId: testSupplier2Id },
        ],
      });

      // Create orders from template
      const result = await service.createOrdersFromTemplateWithDefaults(ctx, template.id);

      // Verify result
      expect(result.success).toBe(true);
      expect(result.orders).toHaveLength(2);

      // Verify orders
      const orders = await prisma.order.findMany({
        where: { practiceId: testPracticeId },
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      });

      // Order for practice supplier 1 should have 2 items
      const order1 = orders.find((o) => o.practiceSupplierId === testPracticeSupplier1Id);
      expect(order1!.items).toHaveLength(2);

      // Order for practice supplier 2 should have 1 item
      const order2 = orders.find((o) => o.practiceSupplierId === testPracticeSupplier2Id);
      expect(order2!.items).toHaveLength(1);
    });

    it('should rollback when order creation fails', async () => {
      // Create template
      const template = await service.createTemplate(ctx, {
        name: 'Test Template',
        description: null,
        items: [
          { itemId: testItem1Id, defaultQuantity: 10, supplierId: testSupplier1Id },
          { itemId: testItem2Id, defaultQuantity: 5, supplierId: testSupplier2Id },
        ],
      });

      // Delete one practice supplier to cause failure
      await prisma.practiceSupplier.delete({
        where: { id: testPracticeSupplier2Id },
      });

      // Try to create orders - should fail
      await expect(
        service.createOrdersFromTemplateWithDefaults(ctx, template.id)
      ).rejects.toThrow();

      // Verify NO orders created (transaction rollback)
      const orders = await prisma.order.findMany({
        where: { practiceId: testPracticeId },
      });
      expect(orders).toHaveLength(0);
    });
  });
});

