
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';

describe('Database Level Inventory Constraints', () => {
  let testPracticeId: string;
  let testUserId: string;
  let testProductId: string;
  let testLocationId: string;
  let testItemId: string;

  beforeEach(async () => {
    // 1. Create Practice
    const practice = await prisma.practice.create({
      data: {
        name: 'Constraint Test Practice',
        slug: `constraint-test-${Date.now()}`,
      },
    });
    testPracticeId = practice.id;

    // 2. Create User (required for some relations)
    const user = await prisma.user.create({
      data: {
        email: `constraint-test-${Date.now()}@example.com`,
        name: 'Constraint Tester',
      },
    });
    testUserId = user.id;

    // 3. Create Location
    const location = await prisma.location.create({
      data: {
        practiceId: testPracticeId,
        name: 'Main Warehouse',
        code: 'WH-MAIN',
      },
    });
    testLocationId = location.id;

    // 4. Create Product
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        isGs1Product: false,
      },
    });
    testProductId = product.id;

    // 5. Create Item
    const item = await prisma.item.create({
      data: {
        practiceId: testPracticeId,
        productId: testProductId,
        name: 'Test Item',
      },
    });
    testItemId = item.id;
  });

  afterEach(async () => {
    // Cleanup (cascading deletes should handle most things, but let's be thorough)
    // Using try-catch to prevent cleanup failures from masking test failures
    try {
        if (testPracticeId) await prisma.practice.deleteMany({ where: { id: testPracticeId } });
        if (testUserId) await prisma.user.deleteMany({ where: { id: testUserId } });
        if (testProductId) await prisma.product.deleteMany({ where: { id: testProductId } });
    } catch (e) {
        console.error('Cleanup failed:', e);
    }
  });

  describe('LocationInventory Constraints', () => {
    it('should enforce non-negative quantity', async () => {
      // Should fail
      await expect(
        prisma.locationInventory.create({
          data: {
            locationId: testLocationId,
            itemId: testItemId,
            quantity: -10,
          },
        })
      ).rejects.toThrow();

      // Should succeed
      const inventory = await prisma.locationInventory.create({
        data: {
          locationId: testLocationId,
          itemId: testItemId,
          quantity: 0,
        },
      });
      expect(inventory.quantity).toBe(0);
    });

    it('should enforce non-negative reorderPoint', async () => {
        // Should fail
        await expect(
          prisma.locationInventory.create({
            data: {
              locationId: testLocationId,
              itemId: testItemId,
              quantity: 100,
              reorderPoint: -1
            },
          })
        ).rejects.toThrow();
  
        // Should succeed with null (optional)
        await prisma.locationInventory.create({
          data: {
            locationId: testLocationId,
            itemId: testItemId,
            quantity: 100,
            reorderPoint: null
          },
        });
    });

    it('should enforce positive reorderQuantity', async () => {
         // Should fail (0)
         await expect(
            prisma.locationInventory.create({
              data: {
                locationId: testLocationId,
                itemId: testItemId,
                quantity: 100,
                reorderQuantity: 0
              },
            })
          ).rejects.toThrow();

          // Should fail (negative)
          // Cleanup previous entry if needed or use update
          await prisma.locationInventory.deleteMany({ where: { locationId: testLocationId, itemId: testItemId }});

          await expect(
            prisma.locationInventory.create({
              data: {
                locationId: testLocationId,
                itemId: testItemId,
                quantity: 100,
                reorderQuantity: -5
              },
            })
          ).rejects.toThrow();
    });
  });

  describe('StockAdjustment Constraints', () => {
    it('should enforce non-zero quantity', async () => {
      // Should fail
      await expect(
        prisma.stockAdjustment.create({
          data: {
            practiceId: testPracticeId,
            locationId: testLocationId,
            itemId: testItemId,
            quantity: 0,
            reason: 'Testing',
            createdById: testUserId,
          },
        })
      ).rejects.toThrow();

      // Should succeed (positive)
      await prisma.stockAdjustment.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          itemId: testItemId,
          quantity: 10,
          reason: 'Testing Positive',
          createdById: testUserId,
        },
      });

      // Should succeed (negative)
      await prisma.stockAdjustment.create({
        data: {
          practiceId: testPracticeId,
          locationId: testLocationId,
          itemId: testItemId,
          quantity: -5,
          reason: 'Testing Negative',
          createdById: testUserId,
        },
      });
    });
  });

  describe('InventoryTransfer Constraints', () => {
    it('should enforce positive quantity', async () => {
        const location2 = await prisma.location.create({
            data: {
              practiceId: testPracticeId,
              name: 'Secondary Warehouse',
              code: 'WH-SEC',
            },
          });

      // Should fail
      await expect(
        prisma.inventoryTransfer.create({
          data: {
            practiceId: testPracticeId,
            itemId: testItemId,
            fromLocationId: testLocationId,
            toLocationId: location2.id,
            quantity: 0,
            createdById: testUserId,
          },
        })
      ).rejects.toThrow();

      await expect(
        prisma.inventoryTransfer.create({
          data: {
            practiceId: testPracticeId,
            itemId: testItemId,
            fromLocationId: testLocationId,
            toLocationId: location2.id,
            quantity: -10,
            createdById: testUserId,
          },
        })
      ).rejects.toThrow();

      // Should succeed
      await prisma.inventoryTransfer.create({
        data: {
            practiceId: testPracticeId,
            itemId: testItemId,
            fromLocationId: testLocationId,
            toLocationId: location2.id,
            quantity: 10,
            createdById: testUserId,
        },
      });
    });
  });
});

