/**
 * Unique Constraints Tests
 * 
 * Tests database-level unique constraints for:
 * - Item: practiceId + name
 * - Item: practiceId + sku (where sku IS NOT NULL)
 * - Location: practiceId + code (where code IS NOT NULL)
 * - PracticeUser: practiceId + userId (existing constraint verification)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import assert from 'assert';

describe('Database Unique Constraints', () => {
  let testPractice1Id: string;
  let testPractice2Id: string;
  let testUserId: string;
  let testProductId: string;

  beforeEach(async () => {
    // Create test practices
    const practice1 = await prisma.practice.create({
      data: {
        name: 'Test Practice 1',
        slug: `test-practice-1-${Date.now()}`,
      },
    });
    testPractice1Id = practice1.id;

    const practice2 = await prisma.practice.create({
      data: {
        name: 'Test Practice 2',
        slug: `test-practice-2-${Date.now()}`,
      },
    });
    testPractice2Id = practice2.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@test.com`,
        name: 'Test User',
        passwordHash: 'test',
      },
    });
    testUserId = user.id;

    // Create test product
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        isGs1Product: false,
      },
    });
    testProductId = product.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.item.deleteMany({
      where: { practiceId: { in: [testPractice1Id, testPractice2Id] } },
    });
    await prisma.location.deleteMany({
      where: { practiceId: { in: [testPractice1Id, testPractice2Id] } },
    });
    await prisma.practiceUser.deleteMany({
      where: { practiceId: { in: [testPractice1Id, testPractice2Id] } },
    });
    await prisma.product.deleteMany({
      where: { id: testProductId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await prisma.practice.deleteMany({
      where: { id: { in: [testPractice1Id, testPractice2Id] } },
    });
  });

  describe('Item - practiceId + name uniqueness', () => {
    it('should allow creating item with unique name', async () => {
      const item = await prisma.item.create({
        data: {
          practiceId: testPractice1Id,
          productId: testProductId,
          name: 'Unique Item Name',
          sku: 'SKU-001',
        },
      });

      expect(item).toBeDefined();
      expect(item.name).toBe('Unique Item Name');
    });

    it('should prevent duplicate item names in same practice', async () => {
      // Create first item
      await prisma.item.create({
        data: {
          practiceId: testPractice1Id,
          productId: testProductId,
          name: 'Duplicate Name',
          sku: 'SKU-001',
        },
      });

      // Try to create duplicate - should fail
      await expect(
        prisma.item.create({
          data: {
            practiceId: testPractice1Id,
            productId: testProductId,
            name: 'Duplicate Name',
            sku: 'SKU-002', // Different SKU, same name
          },
        })
      ).rejects.toThrow();

      // Verify it's a unique constraint violation
      try {
        await prisma.item.create({
          data: {
            practiceId: testPractice1Id,
            productId: testProductId,
            name: 'Duplicate Name',
            sku: 'SKU-003',
          },
        });
        assert.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect((error as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');
        expect((error as Prisma.PrismaClientKnownRequestError).meta?.target).toContain('practiceId');
        expect((error as Prisma.PrismaClientKnownRequestError).meta?.target).toContain('name');
      }
    });

    it('should allow same item name in different practices', async () => {
      // Create item in practice 1
      const item1 = await prisma.item.create({
        data: {
          practiceId: testPractice1Id,
          productId: testProductId,
          name: 'Shared Name',
          sku: 'SKU-P1',
        },
      });

      // Create item with same name in practice 2 - should succeed
      const item2 = await prisma.item.create({
        data: {
          practiceId: testPractice2Id,
          productId: testProductId,
          name: 'Shared Name',
          sku: 'SKU-P2',
        },
      });

      expect(item1.name).toBe(item2.name);
      expect(item1.practiceId).not.toBe(item2.practiceId);
    });
  });

  describe('Item - practiceId + sku uniqueness (where sku IS NOT NULL)', () => {
    it('should allow creating item with unique SKU', async () => {
      const item = await prisma.item.create({
        data: {
          practiceId: testPractice1Id,
          productId: testProductId,
          name: 'Item With SKU',
          sku: 'UNIQUE-SKU-001',
        },
      });

      expect(item).toBeDefined();
      expect(item.sku).toBe('UNIQUE-SKU-001');
    });

    it('should prevent duplicate SKUs in same practice', async () => {
      // Create first item with SKU
      await prisma.item.create({
        data: {
          practiceId: testPractice1Id,
          productId: testProductId,
          name: 'Item 1',
          sku: 'DUP-SKU',
        },
      });

      // Try to create item with duplicate SKU - should fail
      await expect(
        prisma.item.create({
          data: {
            practiceId: testPractice1Id,
            productId: testProductId,
            name: 'Item 2', // Different name, same SKU
            sku: 'DUP-SKU',
          },
        })
      ).rejects.toThrow();

      try {
        await prisma.item.create({
          data: {
            practiceId: testPractice1Id,
            productId: testProductId,
            name: 'Item 3',
            sku: 'DUP-SKU',
          },
        });
        assert.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect((error as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');
      }
    });

    it('should allow same SKU in different practices', async () => {
      // Create item in practice 1
      const item1 = await prisma.item.create({
        data: {
          practiceId: testPractice1Id,
          productId: testProductId,
          name: 'Item P1',
          sku: 'SHARED-SKU',
        },
      });

      // Create item with same SKU in practice 2 - should succeed
      const item2 = await prisma.item.create({
        data: {
          practiceId: testPractice2Id,
          productId: testProductId,
          name: 'Item P2',
          sku: 'SHARED-SKU',
        },
      });

      expect(item1.sku).toBe(item2.sku);
      expect(item1.practiceId).not.toBe(item2.practiceId);
    });

    it('should allow multiple NULL SKUs in same practice', async () => {
      // Create multiple items with NULL SKU - should all succeed
      const item1 = await prisma.item.create({
        data: {
          practiceId: testPractice1Id,
          productId: testProductId,
          name: 'Item Without SKU 1',
          sku: null,
        },
      });

      const item2 = await prisma.item.create({
        data: {
          practiceId: testPractice1Id,
          productId: testProductId,
          name: 'Item Without SKU 2',
          sku: null,
        },
      });

      const item3 = await prisma.item.create({
        data: {
          practiceId: testPractice1Id,
          productId: testProductId,
          name: 'Item Without SKU 3',
          sku: null,
        },
      });

      expect(item1.sku).toBeNull();
      expect(item2.sku).toBeNull();
      expect(item3.sku).toBeNull();
    });
  });

  describe('Location - practiceId + code uniqueness (where code IS NOT NULL)', () => {
    it('should allow creating location with unique code', async () => {
      const location = await prisma.location.create({
        data: {
          practiceId: testPractice1Id,
          name: 'Location 1',
          code: 'LOC-001',
        },
      });

      expect(location).toBeDefined();
      expect(location.code).toBe('LOC-001');
    });

    it('should prevent duplicate location codes in same practice', async () => {
      // Create first location
      await prisma.location.create({
        data: {
          practiceId: testPractice1Id,
          name: 'Location 1',
          code: 'DUP-CODE',
        },
      });

      // Try to create duplicate - should fail
      await expect(
        prisma.location.create({
          data: {
            practiceId: testPractice1Id,
            name: 'Location 2', // Different name, same code
            code: 'DUP-CODE',
          },
        })
      ).rejects.toThrow();

      try {
        await prisma.location.create({
          data: {
            practiceId: testPractice1Id,
            name: 'Location 3',
            code: 'DUP-CODE',
          },
        });
        assert.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect((error as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');
      }
    });

    it('should allow same location code in different practices', async () => {
      // Create location in practice 1
      const location1 = await prisma.location.create({
        data: {
          practiceId: testPractice1Id,
          name: 'Warehouse P1',
          code: 'WH-01',
        },
      });

      // Create location with same code in practice 2 - should succeed
      const location2 = await prisma.location.create({
        data: {
          practiceId: testPractice2Id,
          name: 'Warehouse P2',
          code: 'WH-01',
        },
      });

      expect(location1.code).toBe(location2.code);
      expect(location1.practiceId).not.toBe(location2.practiceId);
    });

    it('should allow multiple NULL codes in same practice', async () => {
      // Create multiple locations with NULL code - should all succeed
      const location1 = await prisma.location.create({
        data: {
          practiceId: testPractice1Id,
          name: 'Location Without Code 1',
          code: null,
        },
      });

      const location2 = await prisma.location.create({
        data: {
          practiceId: testPractice1Id,
          name: 'Location Without Code 2',
          code: null,
        },
      });

      const location3 = await prisma.location.create({
        data: {
          practiceId: testPractice1Id,
          name: 'Location Without Code 3',
          code: null,
        },
      });

      expect(location1.code).toBeNull();
      expect(location2.code).toBeNull();
      expect(location3.code).toBeNull();
    });
  });

  describe('PracticeUser - practiceId + userId uniqueness (existing constraint)', () => {
    it('should allow creating membership with unique practiceId+userId', async () => {
      const membership = await prisma.practiceUser.create({
        data: {
          practiceId: testPractice1Id,
          userId: testUserId,
          role: 'STAFF',
          status: 'ACTIVE',
        },
      });

      expect(membership).toBeDefined();
      expect(membership.practiceId).toBe(testPractice1Id);
      expect(membership.userId).toBe(testUserId);
    });

    it('should prevent duplicate practiceId+userId membership', async () => {
      // Create first membership
      await prisma.practiceUser.create({
        data: {
          practiceId: testPractice1Id,
          userId: testUserId,
          role: 'STAFF',
          status: 'ACTIVE',
        },
      });

      // Try to create duplicate membership - should fail
      await expect(
        prisma.practiceUser.create({
          data: {
            practiceId: testPractice1Id,
            userId: testUserId,
            role: 'ADMIN', // Different role
            status: 'INVITED', // Different status
          },
        })
      ).rejects.toThrow();

      try {
        await prisma.practiceUser.create({
          data: {
            practiceId: testPractice1Id,
            userId: testUserId,
            role: 'VIEWER',
            status: 'SUSPENDED',
          },
        });
        assert.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect((error as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');
        expect((error as Prisma.PrismaClientKnownRequestError).meta?.target).toContain('practiceId');
        expect((error as Prisma.PrismaClientKnownRequestError).meta?.target).toContain('userId');
      }
    });

    it('should allow same user in different practices', async () => {
      // Create membership in practice 1
      const membership1 = await prisma.practiceUser.create({
        data: {
          practiceId: testPractice1Id,
          userId: testUserId,
          role: 'STAFF',
          status: 'ACTIVE',
        },
      });

      // Create membership for same user in practice 2 - should succeed
      const membership2 = await prisma.practiceUser.create({
        data: {
          practiceId: testPractice2Id,
          userId: testUserId,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      expect(membership1.userId).toBe(membership2.userId);
      expect(membership1.practiceId).not.toBe(membership2.practiceId);
    });
  });
});

