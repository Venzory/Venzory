/**
 * InventoryRepository - Tenant Isolation Tests
 * Tests that inventory operations properly enforce tenant isolation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { InventoryRepository } from '@/src/repositories/inventory';
import { prisma } from '@/lib/prisma';

describe('InventoryRepository - Tenant Isolation', () => {
  let inventoryRepo: InventoryRepository;
  let practice1Id: string;
  let practice2Id: string;
  let location1Id: string;
  let location2Id: string;
  let item1Id: string;
  let item2Id: string;
  let product1Id: string;

  beforeAll(async () => {
    inventoryRepo = new InventoryRepository();

    // Create test practices
    const practice1 = await prisma.practice.create({
      data: { name: 'Practice 1', slug: 'practice-1-test-inventory-isolation' },
    });
    practice1Id = practice1.id;

    const practice2 = await prisma.practice.create({
      data: { name: 'Practice 2', slug: 'practice-2-test-inventory-isolation' },
    });
    practice2Id = practice2.id;

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
      data: { name: 'Test Product', gtin: '12345678901235' },
    });
    product1Id = product.id;

    // Create items
    const item1 = await prisma.item.create({
      data: {
        practiceId: practice1Id,
        productId: product1Id,
        name: 'Item 1',
        sku: 'INVITEM1',
      },
    });
    item1Id = item1.id;

    const item2 = await prisma.item.create({
      data: {
        practiceId: practice2Id,
        productId: product1Id,
        name: 'Item 2',
        sku: 'INVITEM2',
      },
    });
    item2Id = item2.id;

    // Create inventory for practice1
    await prisma.locationInventory.create({
      data: {
        locationId: location1Id,
        itemId: item1Id,
        quantity: 100,
        reorderPoint: 10,
        reorderQuantity: 50,
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.locationInventory.deleteMany({
      where: { locationId: { in: [location1Id, location2Id] } },
    });
    await prisma.item.deleteMany({
      where: { id: { in: [item1Id, item2Id] } },
    });
    await prisma.location.deleteMany({
      where: { id: { in: [location1Id, location2Id] } },
    });
    await prisma.product.deleteMany({
      where: { id: product1Id },
    });
    await prisma.practice.deleteMany({
      where: { id: { in: [practice1Id, practice2Id] } },
    });
  });

  describe('getLocationInventory', () => {
    it('should NOT return inventory from different practice', async () => {
      // Try to access practice1 inventory with practice2Id
      const result = await inventoryRepo.getLocationInventory(
        item1Id,
        location1Id,
        practice2Id
      );
      expect(result).toBeNull();
    });

    it('should return inventory from same practice', async () => {
      const result = await inventoryRepo.getLocationInventory(
        item1Id,
        location1Id,
        practice1Id
      );
      expect(result).not.toBeNull();
      expect(result?.quantity).toBe(100);
      expect(result?.reorderPoint).toBe(10);
    });
  });

  describe('upsertLocationInventory', () => {
    it('should NOT upsert inventory with wrong practice location', async () => {
      // Try to create inventory with practice2's location but practice1's item
      await expect(
        inventoryRepo.upsertLocationInventory(
          location2Id,
          item1Id,
          50,
          null,
          null,
          practice1Id
        )
      ).rejects.toThrow();
    });

    it('should NOT upsert inventory with wrong practice item', async () => {
      // Try to create inventory with practice1's location but practice2's item
      await expect(
        inventoryRepo.upsertLocationInventory(
          location1Id,
          item2Id,
          50,
          null,
          null,
          practice1Id
        )
      ).rejects.toThrow();
    });

    it('should upsert inventory for same practice', async () => {
      // Create new test item for practice1
      const newItem = await prisma.item.create({
        data: {
          practiceId: practice1Id,
          productId: product1Id,
          name: 'New Item',
          sku: 'NEWITEM',
        },
      });

      const result = await inventoryRepo.upsertLocationInventory(
        location1Id,
        newItem.id,
        25,
        5,
        20,
        practice1Id
      );

      expect(result.quantity).toBe(25);
      expect(result.reorderPoint).toBe(5);
      expect(result.reorderQuantity).toBe(20);

      // Clean up
      await prisma.locationInventory.delete({
        where: {
          locationId_itemId: { locationId: location1Id, itemId: newItem.id },
        },
      });
      await prisma.item.delete({ where: { id: newItem.id } });
    });
  });

  describe('adjustStock', () => {
    it('should NOT adjust stock with wrong practice location', async () => {
      await expect(
        inventoryRepo.adjustStock(location2Id, item1Id, 10, practice1Id)
      ).rejects.toThrow();
    });

    it('should NOT adjust stock with wrong practice item', async () => {
      await expect(
        inventoryRepo.adjustStock(location1Id, item2Id, 10, practice1Id)
      ).rejects.toThrow();
    });

    it('should adjust stock for same practice', async () => {
      const result = await inventoryRepo.adjustStock(
        location1Id,
        item1Id,
        10,
        practice1Id
      );

      expect(result.previousQuantity).toBe(100);
      expect(result.newQuantity).toBe(110);

      // Reset for other tests
      await inventoryRepo.adjustStock(location1Id, item1Id, -10, practice1Id);
    });
  });
});

