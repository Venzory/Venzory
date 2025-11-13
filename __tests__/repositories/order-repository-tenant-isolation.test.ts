/**
 * OrderRepository - Tenant Isolation Tests
 * Tests that order-related operations properly enforce tenant isolation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OrderRepository } from '@/src/repositories/orders';
import { prisma } from '@/lib/prisma';
import { NotFoundError } from '@/src/domain/errors';

describe('OrderRepository - Tenant Isolation', () => {
  let orderRepo: OrderRepository;
  let practice1Id: string;
  let practice2Id: string;
  let order1Id: string;
  let item1Id: string;
  let item2Id: string;
  let product1Id: string;

  beforeAll(async () => {
    orderRepo = new OrderRepository();

    // Create test practices
    const practice1 = await prisma.practice.create({
      data: { name: 'Practice 1', slug: 'practice-1-test-order-isolation' },
    });
    practice1Id = practice1.id;

    const practice2 = await prisma.practice.create({
      data: { name: 'Practice 2', slug: 'practice-2-test-order-isolation' },
    });
    practice2Id = practice2.id;

    // Create a product
    const product = await prisma.product.create({
      data: { name: 'Test Product', gtin: '12345678901234' },
    });
    product1Id = product.id;

    // Create items for both practices
    const item1 = await prisma.item.create({
      data: {
        practiceId: practice1Id,
        productId: product1Id,
        name: 'Item 1',
        sku: 'ITEM1',
      },
    });
    item1Id = item1.id;

    const item2 = await prisma.item.create({
      data: {
        practiceId: practice2Id,
        productId: product1Id,
        name: 'Item 2',
        sku: 'ITEM2',
      },
    });
    item2Id = item2.id;

    // Create an order for practice1
    const order = await prisma.order.create({
      data: {
        practiceId: practice1Id,
        status: 'DRAFT',
      },
    });
    order1Id = order.id;

    // Add an item to the order
    await prisma.orderItem.create({
      data: {
        orderId: order1Id,
        itemId: item1Id,
        quantity: 10,
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.orderItem.deleteMany({
      where: { orderId: order1Id },
    });
    await prisma.order.deleteMany({
      where: { id: order1Id },
    });
    await prisma.item.deleteMany({
      where: { id: { in: [item1Id, item2Id] } },
    });
    await prisma.product.deleteMany({
      where: { id: product1Id },
    });
    await prisma.practice.deleteMany({
      where: { id: { in: [practice1Id, practice2Id] } },
    });
  });

  describe('findOrderItem', () => {
    it('should NOT find order item from different practice', async () => {
      // Try to access order1 item with practice2Id
      await expect(
        orderRepo.findOrderItem(order1Id, item1Id, practice2Id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should find order item from same practice', async () => {
      const result = await orderRepo.findOrderItem(order1Id, item1Id, practice1Id);
      expect(result).not.toBeNull();
      expect(result?.orderId).toBe(order1Id);
      expect(result?.itemId).toBe(item1Id);
    });
  });

  describe('addOrderItem', () => {
    it('should NOT add item to order from different practice', async () => {
      await expect(
        orderRepo.addOrderItem(order1Id, practice2Id, {
          itemId: item2Id,
          quantity: 5,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should add item to order from same practice', async () => {
      // Create a new test item for practice1
      const newItem = await prisma.item.create({
        data: {
          practiceId: practice1Id,
          productId: product1Id,
          name: 'New Test Item',
          sku: 'NEWITEM',
        },
      });

      const result = await orderRepo.addOrderItem(order1Id, practice1Id, {
        itemId: newItem.id,
        quantity: 5,
      });

      expect(result.orderId).toBe(order1Id);
      expect(result.itemId).toBe(newItem.id);
      expect(result.quantity).toBe(5);

      // Clean up
      await prisma.orderItem.delete({
        where: { orderId_itemId: { orderId: order1Id, itemId: newItem.id } },
      });
      await prisma.item.delete({ where: { id: newItem.id } });
    });
  });

  describe('updateOrderItem', () => {
    it('should NOT update order item from different practice', async () => {
      await expect(
        orderRepo.updateOrderItem(order1Id, item1Id, practice2Id, {
          quantity: 20,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should update order item from same practice', async () => {
      const result = await orderRepo.updateOrderItem(order1Id, item1Id, practice1Id, {
        quantity: 15,
      });

      expect(result.orderId).toBe(order1Id);
      expect(result.itemId).toBe(item1Id);
      expect(result.quantity).toBe(15);

      // Reset for other tests
      await orderRepo.updateOrderItem(order1Id, item1Id, practice1Id, {
        quantity: 10,
      });
    });
  });

  describe('removeOrderItem', () => {
    it('should NOT remove order item from different practice', async () => {
      await expect(
        orderRepo.removeOrderItem(order1Id, item1Id, practice2Id)
      ).rejects.toThrow(NotFoundError);
    });

    it('should remove order item from same practice', async () => {
      // Create a test item to remove
      const testItem = await prisma.item.create({
        data: {
          practiceId: practice1Id,
          productId: product1Id,
          name: 'Item to Remove',
          sku: 'REMOVEITEM',
        },
      });

      await prisma.orderItem.create({
        data: {
          orderId: order1Id,
          itemId: testItem.id,
          quantity: 5,
        },
      });

      // Should not throw
      await orderRepo.removeOrderItem(order1Id, testItem.id, practice1Id);

      // Verify it's gone
      const result = await prisma.orderItem.findUnique({
        where: { orderId_itemId: { orderId: order1Id, itemId: testItem.id } },
      });
      expect(result).toBeNull();

      // Clean up
      await prisma.item.delete({ where: { id: testItem.id } });
    });
  });
});

