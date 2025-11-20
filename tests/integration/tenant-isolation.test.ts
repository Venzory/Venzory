/**
 * Integration Tests - Tenant Isolation
 * Tests cross-tenant access prevention at service and API levels
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OrderService, getOrderService } from '@/src/services/orders';
import { InventoryService, getInventoryService } from '@/src/services/inventory';
import { ReceivingService, getReceivingService } from '@/src/services/receiving';
import { prisma } from '@/lib/prisma';
import type { RequestContext } from '@/src/lib/context/request-context';
import { NotFoundError } from '@/src/domain/errors';

describe('Cross-Tenant Access Prevention - Integration Tests', () => {
  let orderService: OrderService;
  let inventoryService: InventoryService;
  let receivingService: ReceivingService;

  let practice1Id: string;
  let practice2Id: string;
  let user1Id: string;
  let user2Id: string;
  let location1Id: string;
  let location2Id: string;
  let item1Id: string;
  let item2Id: string;
  let product1Id: string;
  let globalSupplier1Id: string;
  let practiceSupplier1Id: string;
  let order1Id: string;
  let receipt1Id: string;
  let receiptLine1Id: string;

  let ctx1: RequestContext;
  let ctx2: RequestContext;

  beforeAll(async () => {
    orderService = getOrderService();
    inventoryService = getInventoryService();
    receivingService = getReceivingService();

    // Create test practices
    const practice1 = await prisma.practice.create({
      data: { name: 'Practice 1', slug: 'practice-1-integration-test' },
    });
    practice1Id = practice1.id;

    const practice2 = await prisma.practice.create({
      data: { name: 'Practice 2', slug: 'practice-2-integration-test' },
    });
    practice2Id = practice2.id;

    // Create test users
    const user1 = await prisma.user.create({
      data: { email: 'user1-integration@test.com', name: 'User 1' },
    });
    user1Id = user1.id;

    const user2 = await prisma.user.create({
      data: { email: 'user2-integration@test.com', name: 'User 2' },
    });
    user2Id = user2.id;

    // Create practice memberships
    await prisma.practiceUser.create({
      data: {
        practiceId: practice1Id,
        userId: user1Id,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    await prisma.practiceUser.create({
      data: {
        practiceId: practice2Id,
        userId: user2Id,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    // Create locations
    const location1 = await prisma.location.create({
      data: { practiceId: practice1Id, name: 'Location 1', code: 'LOC1' },
    });
    location1Id = location1.id;

    const location2 = await prisma.location.create({
      data: { practiceId: practice2Id, name: 'Location 2', code: 'LOC2' },
    });
    location2Id = location2.id;

    // Create a product
    const product = await prisma.product.create({
      data: { name: 'Test Product', gtin: '12345678901238' },
    });
    product1Id = product.id;

    // Create items
    const item1 = await prisma.item.create({
      data: {
        practiceId: practice1Id,
        productId: product1Id,
        name: 'Item 1',
        sku: 'INTITEM1',
      },
    });
    item1Id = item1.id;

    const item2 = await prisma.item.create({
      data: {
        practiceId: practice2Id,
        productId: product1Id,
        name: 'Item 2',
        sku: 'INTITEM2',
      },
    });
    item2Id = item2.id;

    // Create inventory
    await prisma.locationInventory.create({
      data: {
        locationId: location1Id,
        itemId: item1Id,
        quantity: 100,
        reorderPoint: 10,
        reorderQuantity: 50,
      },
    });

    // Create GlobalSupplier and PracticeSupplier for practice1
    const globalSupplier1 = await prisma.globalSupplier.create({
      data: {
        name: 'Global Supplier 1',
      },
    });
    globalSupplier1Id = globalSupplier1.id;

    const practiceSupplier1 = await prisma.practiceSupplier.create({
      data: {
        practiceId: practice1Id,
        globalSupplierId: globalSupplier1Id,
      },
    });
    practiceSupplier1Id = practiceSupplier1.id;

    // Create an order for practice1
    const order = await prisma.order.create({
      data: {
        practiceId: practice1Id,
        practiceSupplierId: practiceSupplier1Id,
        status: 'DRAFT',
      },
    });
    order1Id = order.id;

    await prisma.orderItem.create({
      data: {
        orderId: order1Id,
        itemId: item1Id,
        quantity: 10,
      },
    });

    // Create a goods receipt for practice1
    const receipt = await prisma.goodsReceipt.create({
      data: {
        practiceId: practice1Id,
        locationId: location1Id,
        status: 'DRAFT',
      },
    });
    receipt1Id = receipt.id;

    const receiptLine = await prisma.goodsReceiptLine.create({
      data: {
        receiptId: receipt1Id,
        itemId: item1Id,
        quantity: 10,
      },
    });
    receiptLine1Id = receiptLine.id;

    // Create request contexts
    ctx1 = {
      requestId: 'test-req-1',
      userId: user1Id,
      userEmail: 'user1-integration@test.com',
      userName: 'User 1',
      practiceId: practice1Id,
      role: 'ADMIN',
      memberships: [],
      timestamp: new Date(),
    };

    ctx2 = {
      requestId: 'test-req-2',
      userId: user2Id,
      userEmail: 'user2-integration@test.com',
      userName: 'User 2',
      practiceId: practice2Id,
      role: 'ADMIN',
      memberships: [],
      timestamp: new Date(),
    };
  });

  afterAll(async () => {
    // Clean up (in reverse order of dependencies)
    if (receipt1Id) {
      await prisma.goodsReceiptLine.deleteMany({
        where: { receiptId: receipt1Id },
      });
      await prisma.goodsReceipt.deleteMany({
        where: { id: receipt1Id },
      });
    }
    
    if (order1Id) {
      await prisma.orderItem.deleteMany({
        where: { orderId: order1Id },
      });
      await prisma.order.deleteMany({
        where: { id: order1Id },
      });
    }

    if (location1Id && location2Id) {
      await prisma.locationInventory.deleteMany({
        where: { locationId: { in: [location1Id, location2Id] } },
      });
    }
    
    if (item1Id && item2Id) {
      await prisma.item.deleteMany({
        where: { id: { in: [item1Id, item2Id] } },
      });
    }
    
    if (location1Id && location2Id) {
      await prisma.location.deleteMany({
        where: { id: { in: [location1Id, location2Id] } },
      });
    }

    if (product1Id) {
      await prisma.product.deleteMany({
        where: { id: product1Id },
      });
    }

    if (practice1Id && practice2Id) {
      await prisma.practiceSupplier.deleteMany({
        where: { practiceId: { in: [practice1Id, practice2Id] } },
      });
    }

    if (globalSupplier1Id) {
      await prisma.globalSupplier.deleteMany({
        where: { id: globalSupplier1Id },
      });
    }

    if (practice1Id && practice2Id) {
      await prisma.practiceUser.deleteMany({
        where: { practiceId: { in: [practice1Id, practice2Id] } },
      });
      await prisma.practice.deleteMany({
        where: { id: { in: [practice1Id, practice2Id] } },
      });
    }

    if (user1Id && user2Id) {
      await prisma.user.deleteMany({
        where: { id: { in: [user1Id, user2Id] } },
      });
    }
  });

  describe('OrderService - Cross-Tenant Prevention', () => {
    it('should prevent accessing another practice order', async () => {
      // User2 (practice2) tries to access practice1's order
      await expect(
        orderService.getOrderById(ctx2, order1Id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should prevent adding item to another practice order', async () => {
      // User2 (practice2) tries to add item to practice1's order
      await expect(
        orderService.addOrderItem(ctx2, order1Id, {
          itemId: item2Id,
          quantity: 5,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should allow access to same practice order', async () => {
      const order = await orderService.getOrderById(ctx1, order1Id);
      expect(order.id).toBe(order1Id);
      expect(order.practiceId).toBe(practice1Id);
    });
  });

  describe('InventoryService - Cross-Tenant Prevention', () => {
    it('should prevent accessing another practice inventory', async () => {
      // User2 (practice2) tries to access practice1's item
      await expect(
        inventoryService.getItemById(ctx2, item1Id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should prevent adjusting stock in another practice', async () => {
      // User2 (practice2) tries to adjust practice1's inventory
      await expect(
        inventoryService.adjustStock(ctx2, {
          itemId: item1Id,
          locationId: location1Id,
          quantity: 10,
          reason: 'Test',
        })
      ).rejects.toThrow();
    });

    it('should allow access to same practice inventory', async () => {
      const item = await inventoryService.getItemById(ctx1, item1Id);
      expect(item.id).toBe(item1Id);
      expect(item.practiceId).toBe(practice1Id);
    });
  });

  describe('ReceivingService - Cross-Tenant Prevention', () => {
    it('should prevent accessing another practice goods receipt', async () => {
      // User2 (practice2) tries to access practice1's receipt
      await expect(
        receivingService.getGoodsReceiptById(ctx2, receipt1Id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should prevent updating another practice receipt line', async () => {
      // User2 (practice2) tries to update practice1's receipt line
      await expect(
        receivingService.updateReceiptLine(ctx2, receiptLine1Id, {
          quantity: 20,
        })
      ).rejects.toThrow();
    });

    it('should allow access to same practice receipt', async () => {
      const receipt = await receivingService.getGoodsReceiptById(ctx1, receipt1Id);
      expect(receipt.id).toBe(receipt1Id);
      expect(receipt.practiceId).toBe(practice1Id);
    });
  });

  describe('Cross-Practice Item References', () => {
    it('should prevent creating order with another practice item', async () => {
      // User1 (practice1) tries to create order with practice2's item
      await expect(
        orderService.createOrder(ctx1, {
          practiceSupplierId: practiceSupplier1Id,
          items: [{ itemId: item2Id, quantity: 5 }],
        })
      ).rejects.toThrow();
    });

    it('should prevent inventory transfer with cross-practice items', async () => {
      // Try to transfer from practice1's location to practice2's location
      await expect(
        inventoryService.transferInventory(ctx1, {
          itemId: item1Id,
          fromLocationId: location1Id,
          toLocationId: location2Id,
          quantity: 10,
        })
      ).rejects.toThrow();
    });
  });
});

