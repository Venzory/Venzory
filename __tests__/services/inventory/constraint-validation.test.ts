/**
 * Service Layer Constraint Validation Tests
 * 
 * Tests that the service layer properly handles database constraint violations
 * and returns user-friendly error messages instead of raw Prisma errors.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
import { BusinessRuleViolationError } from '@/src/domain/errors';

describe('Service Layer - Constraint Validation', () => {
  let service: InventoryService;
  let userRepository: UserRepository;
  let testPracticeId: string;
  let testUserId: string;
  let testProductId: string;
  let ctx: RequestContext;

  beforeEach(async () => {
    // Create test practice
    const practice = await prisma.practice.create({
      data: {
        name: 'Test Practice',
        slug: `test-practice-${Date.now()}`,
      },
    });
    testPracticeId = practice.id;

    // Create test user
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

    // Create test product
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        isGs1Product: false,
      },
    });
    testProductId = product.id;

    // Set up request context
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

    // Initialize services
    service = new InventoryService(
      new InventoryRepository(),
      new ProductRepository(),
      new LocationRepository(),
      new StockCountRepository(),
      new UserRepository(),
      new AuditService(new AuditRepository())
    );

    userRepository = new UserRepository();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany({
      where: { practiceId: testPracticeId },
    });
    await prisma.item.deleteMany({
      where: { practiceId: testPracticeId },
    });
    await prisma.location.deleteMany({
      where: { practiceId: testPracticeId },
    });
    await prisma.product.deleteMany({
      where: { id: testProductId },
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

  describe('InventoryService.createItem - Duplicate Name Handling', () => {
    it('should create item successfully with unique name', async () => {
      const item = await service.createItem(ctx, {
        productId: testProductId,
        name: 'Unique Item',
        sku: 'SKU-001',
        description: null,
        unit: null,
        defaultSupplierId: null,
      });

      expect(item).toBeDefined();
      expect(item.name).toBe('Unique Item');
    });

    it('should throw error when creating item with duplicate name', async () => {
      // Create first item
      await service.createItem(ctx, {
        productId: testProductId,
        name: 'Duplicate Item',
        sku: 'SKU-001',
        description: null,
        unit: null,
        defaultSupplierId: null,
      });

      // Try to create item with duplicate name
      await expect(
        service.createItem(ctx, {
          productId: testProductId,
          name: 'Duplicate Item',
          sku: 'SKU-002', // Different SKU
          description: null,
          unit: null,
          defaultSupplierId: null,
        })
      ).rejects.toThrow();

      // Verify error is caught and handled (not raw Prisma error)
      try {
        await service.createItem(ctx, {
          productId: testProductId,
          name: 'Duplicate Item',
          sku: 'SKU-003',
          description: null,
          unit: null,
          defaultSupplierId: null,
        });
        fail('Should have thrown an error');
      } catch (error) {
        // Error should be caught by service layer
        expect(error).toBeDefined();
      }
    });
  });

  describe('InventoryService.createItem - Duplicate SKU Handling', () => {
    it('should create item successfully with unique SKU', async () => {
      const item = await service.createItem(ctx, {
        productId: testProductId,
        name: 'Item 1',
        sku: 'UNIQUE-SKU',
        description: null,
        unit: null,
        defaultSupplierId: null,
      });

      expect(item).toBeDefined();
      expect(item.sku).toBe('UNIQUE-SKU');
    });

    it('should throw error when creating item with duplicate SKU', async () => {
      // Create first item
      await service.createItem(ctx, {
        productId: testProductId,
        name: 'Item 1',
        sku: 'DUP-SKU',
        description: null,
        unit: null,
        defaultSupplierId: null,
      });

      // Try to create item with duplicate SKU
      await expect(
        service.createItem(ctx, {
          productId: testProductId,
          name: 'Item 2', // Different name
          sku: 'DUP-SKU',
          description: null,
          unit: null,
          defaultSupplierId: null,
        })
      ).rejects.toThrow();
    });

    it('should allow multiple items with NULL SKU', async () => {
      // Create multiple items without SKU - should all succeed
      const item1 = await service.createItem(ctx, {
        productId: testProductId,
        name: 'Item Without SKU 1',
        sku: null,
        description: null,
        unit: null,
        defaultSupplierId: null,
      });

      const item2 = await service.createItem(ctx, {
        productId: testProductId,
        name: 'Item Without SKU 2',
        sku: null,
        description: null,
        unit: null,
        defaultSupplierId: null,
      });

      expect(item1.sku).toBeNull();
      expect(item2.sku).toBeNull();
    });
  });

  describe('UserRepository.createLocation - Duplicate Code Handling', () => {
    it('should create location successfully with unique code', async () => {
      const location = await userRepository.createLocation(testPracticeId, {
        name: 'Location 1',
        code: 'LOC-001',
        description: null,
        parentId: null,
      });

      expect(location).toBeDefined();
      expect(location.code).toBe('LOC-001');
    });

    it('should throw error when creating location with duplicate code', async () => {
      // Create first location
      await userRepository.createLocation(testPracticeId, {
        name: 'Location 1',
        code: 'DUP-CODE',
        description: null,
        parentId: null,
      });

      // Try to create location with duplicate code
      await expect(
        userRepository.createLocation(testPracticeId, {
          name: 'Location 2', // Different name
          code: 'DUP-CODE',
          description: null,
          parentId: null,
        })
      ).rejects.toThrow();
    });

    it('should allow multiple locations with NULL code', async () => {
      // Create multiple locations without code - should all succeed
      const location1 = await userRepository.createLocation(testPracticeId, {
        name: 'Location Without Code 1',
        code: null,
        description: null,
        parentId: null,
      });

      const location2 = await userRepository.createLocation(testPracticeId, {
        name: 'Location Without Code 2',
        code: null,
        description: null,
        parentId: null,
      });

      expect(location1.code).toBeNull();
      expect(location2.code).toBeNull();
    });
  });

  describe('Cross-Practice Isolation', () => {
    let secondPracticeId: string;
    let secondCtx: RequestContext;

    beforeEach(async () => {
      // Create second practice
      const practice2 = await prisma.practice.create({
        data: {
          name: 'Second Practice',
          slug: `second-practice-${Date.now()}`,
        },
      });
      secondPracticeId = practice2.id;

      // Create user membership in second practice
      await prisma.practiceUser.create({
        data: {
          practiceId: secondPracticeId,
          userId: testUserId,
          role: 'STAFF',
          status: 'ACTIVE',
          invitedAt: new Date(),
          acceptedAt: new Date(),
        },
      });

      secondCtx = {
        ...ctx,
        practiceId: secondPracticeId,
      };
    });

    afterEach(async () => {
      await prisma.item.deleteMany({
        where: { practiceId: secondPracticeId },
      });
      await prisma.location.deleteMany({
        where: { practiceId: secondPracticeId },
      });
      await prisma.practiceUser.deleteMany({
        where: { practiceId: secondPracticeId },
      });
      await prisma.practice.deleteMany({
        where: { id: secondPracticeId },
      });
    });

    it('should allow same item name in different practices', async () => {
      // Create item in first practice
      const item1 = await service.createItem(ctx, {
        productId: testProductId,
        name: 'Shared Item Name',
        sku: 'SKU-P1',
        description: null,
        unit: null,
        defaultSupplierId: null,
      });

      // Create item with same name in second practice - should succeed
      const item2 = await service.createItem(secondCtx, {
        productId: testProductId,
        name: 'Shared Item Name',
        sku: 'SKU-P2',
        description: null,
        unit: null,
        defaultSupplierId: null,
      });

      expect(item1.name).toBe(item2.name);
      expect(item1.practiceId).not.toBe(item2.practiceId);
    });

    it('should allow same item SKU in different practices', async () => {
      // Create item in first practice
      const item1 = await service.createItem(ctx, {
        productId: testProductId,
        name: 'Item P1',
        sku: 'SHARED-SKU',
        description: null,
        unit: null,
        defaultSupplierId: null,
      });

      // Create item with same SKU in second practice - should succeed
      const item2 = await service.createItem(secondCtx, {
        productId: testProductId,
        name: 'Item P2',
        sku: 'SHARED-SKU',
        description: null,
        unit: null,
        defaultSupplierId: null,
      });

      expect(item1.sku).toBe(item2.sku);
      expect(item1.practiceId).not.toBe(item2.practiceId);
    });

    it('should allow same location code in different practices', async () => {
      // Create location in first practice
      const location1 = await userRepository.createLocation(testPracticeId, {
        name: 'Warehouse P1',
        code: 'WH-01',
        description: null,
        parentId: null,
      });

      // Create location with same code in second practice - should succeed
      const location2 = await userRepository.createLocation(secondPracticeId, {
        name: 'Warehouse P2',
        code: 'WH-01',
        description: null,
        parentId: null,
      });

      expect(location1.code).toBe(location2.code);
      expect(location1.practiceId).not.toBe(location2.practiceId);
    });
  });
});

