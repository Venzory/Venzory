/**
 * Stock Count Flow Integration Test
 * End-to-end test covering the full stock count workflow including:
 * - Creating a session
 * - Adding count lines with variance
 * - Completing with adjustments
 * - Verifying inventory updates
 * - Blocking edits on completed sessions
 * - Enforcing single IN_PROGRESS session per location
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InventoryService } from '@/src/services/inventory/inventory-service';
import { InventoryRepository } from '@/src/repositories/inventory';
import { ProductRepository } from '@/src/repositories/products';
import { LocationRepository } from '@/src/repositories/locations';
import { StockCountRepository } from '@/src/repositories/stock-count';
import { UserRepository } from '@/src/repositories/users';
import { AuditService } from '@/src/services/audit/audit-service';
import { AuditRepository } from '@/src/repositories/audit';
import { prisma } from '@/lib/prisma';
import { BusinessRuleViolationError, ValidationError } from '@/src/domain/errors';
import type { RequestContext } from '@/src/lib/context/request-context';
import { createTestContext } from '@/src/lib/context/request-context';

describe('Stock Count Flow Integration', () => {
  let inventoryService: InventoryService;
  let testPracticeId: string;
  let testLocationId: string;
  let testUserId: string;
  let testItemId: string;
  let testProductId: string;
  let ctx: RequestContext;

  beforeEach(async () => {
    // Create service with real repositories
    const inventoryRepo = new InventoryRepository();
    const productRepo = new ProductRepository();
    const locationRepo = new LocationRepository();
    const stockCountRepo = new StockCountRepository();
    const userRepo = new UserRepository();
    const auditRepo = new AuditRepository();
    const auditService = new AuditService(auditRepo);

    inventoryService = new InventoryService(
      inventoryRepo,
      productRepo,
      locationRepo,
      stockCountRepo,
      userRepo,
      auditService
    );

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
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
      },
    });
    testUserId = user.id;

    // Create practice membership for user
    await prisma.practiceUser.create({
      data: {
        practiceId: testPracticeId,
        userId: testUserId,
        role: 'STAFF',
      },
    });

    // Create test product
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        gtin: `${Date.now()}`,
      },
    });
    testProductId = product.id;

    // Create test location
    const location = await prisma.location.create({
      data: {
        practiceId: testPracticeId,
        name: 'Test Location',
        code: `LOC-${Date.now()}`,
      },
    });
    testLocationId = location.id;

    // Create test item
    const item = await prisma.item.create({
      data: {
        practiceId: testPracticeId,
        productId: testProductId,
        name: 'Test Item',
        sku: `ITEM-${Date.now()}`,
        unit: 'unit',
      },
    });
    testItemId = item.id;

    // Set initial inventory
    await prisma.locationInventory.create({
      data: {
        locationId: testLocationId,
        itemId: testItemId,
        quantity: 10,
      },
    });

    // Create request context
    ctx = createTestContext({
      practiceId: testPracticeId,
      userId: testUserId,
      role: 'STAFF',
    });
  });

  afterEach(async () => {
    // Clean up test data in correct order
    await prisma.stockAdjustment.deleteMany({ where: { practiceId: testPracticeId } });
    await prisma.stockCountLine.deleteMany({ where: { session: { practiceId: testPracticeId } } });
    await prisma.stockCountSession.deleteMany({ where: { practiceId: testPracticeId } });
    await prisma.locationInventory.deleteMany({ where: { location: { practiceId: testPracticeId } } });
    await prisma.item.deleteMany({ where: { practiceId: testPracticeId } });
    await prisma.location.deleteMany({ where: { practiceId: testPracticeId } });
    await prisma.auditLog.deleteMany({ where: { practiceId: testPracticeId } });
    await prisma.practiceUser.deleteMany({ where: { practiceId: testPracticeId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.practice.deleteMany({ where: { id: testPracticeId } });
  });

  it('should complete full stock count workflow with variance and inventory update', async () => {
    // Step 1: Create stock count session
    const { id: sessionId } = await inventoryService.createStockCountSession(
      ctx,
      testLocationId,
      'Monthly count'
    );

    expect(sessionId).toBeDefined();

    // Verify session was created
    const session = await prisma.stockCountSession.findUnique({
      where: { id: sessionId },
    });
    expect(session).not.toBeNull();
    expect(session?.status).toBe('IN_PROGRESS');

    // Step 2: Add count line with variance (counted 8, system has 10, variance = -2)
    const { lineId, variance } = await inventoryService.addCountLine(
      ctx,
      sessionId,
      testItemId,
      8,
      'Found 2 damaged units'
    );

    expect(lineId).toBeDefined();
    expect(variance).toBe(-2);

    // Verify line was created
    const line = await prisma.stockCountLine.findUnique({
      where: { id: lineId },
    });
    expect(line).not.toBeNull();
    expect(line?.countedQuantity).toBe(8);
    expect(line?.systemQuantity).toBe(10);
    expect(line?.variance).toBe(-2);

    // Step 3: Complete session with adjustments
    const result = await inventoryService.completeStockCount(ctx, sessionId, true, false);

    expect(result.adjustedItems).toBe(1);

    // Verify session is now COMPLETED
    const completedSession = await prisma.stockCountSession.findUnique({
      where: { id: sessionId },
    });
    expect(completedSession?.status).toBe('COMPLETED');
    expect(completedSession?.completedAt).not.toBeNull();

    // Step 4: Verify inventory was updated to counted quantity
    const inventory = await prisma.locationInventory.findUnique({
      where: {
        locationId_itemId: {
          locationId: testLocationId,
          itemId: testItemId,
        },
      },
    });
    expect(inventory?.quantity).toBe(8); // Should be set to counted quantity

    // Step 5: Verify stock adjustment was created
    const adjustment = await prisma.stockAdjustment.findFirst({
      where: {
        practiceId: testPracticeId,
        itemId: testItemId,
        locationId: testLocationId,
        reason: 'Stock Count',
      },
    });
    expect(adjustment).not.toBeNull();
    expect(adjustment?.quantity).toBe(-2); // Variance
    expect(adjustment?.note).toContain(sessionId.slice(0, 8));

    // Step 6: Verify edits are blocked on completed session
    await expect(
      inventoryService.addCountLine(ctx, sessionId, testItemId, 5)
    ).rejects.toThrow(BusinessRuleViolationError);

    await expect(
      inventoryService.addCountLine(ctx, sessionId, testItemId, 5)
    ).rejects.toThrow('Cannot edit completed session');

    // Verify cancel is also blocked
    await expect(
      inventoryService.cancelStockCount(ctx, sessionId)
    ).rejects.toThrow(BusinessRuleViolationError);

    await expect(
      inventoryService.cancelStockCount(ctx, sessionId)
    ).rejects.toThrow('Can only cancel in-progress sessions');
  });

  it('should enforce single IN_PROGRESS session per location', async () => {
    // Create first session
    const { id: sessionId1 } = await inventoryService.createStockCountSession(
      ctx,
      testLocationId,
      'First count'
    );

    expect(sessionId1).toBeDefined();

    // Attempt to create second session for same location should fail
    await expect(
      inventoryService.createStockCountSession(ctx, testLocationId, 'Second count')
    ).rejects.toThrow(BusinessRuleViolationError);

    await expect(
      inventoryService.createStockCountSession(ctx, testLocationId, 'Second count')
    ).rejects.toThrow('An in-progress stock count already exists for this location');

    // Complete the first session
    await inventoryService.addCountLine(ctx, sessionId1, testItemId, 10);
    await inventoryService.completeStockCount(ctx, sessionId1, false);

    // Now should be able to create a new session
    const { id: sessionId2 } = await inventoryService.createStockCountSession(
      ctx,
      testLocationId,
      'Second count after completion'
    );

    expect(sessionId2).toBeDefined();
    expect(sessionId2).not.toBe(sessionId1);
  });

  it('should handle multiple items with mixed variance', async () => {
    // Create additional items
    const item2 = await prisma.item.create({
      data: {
        practiceId: testPracticeId,
        productId: testProductId,
        name: 'Test Item 2',
        sku: `ITEM2-${Date.now()}`,
        unit: 'unit',
      },
    });

    const item3 = await prisma.item.create({
      data: {
        practiceId: testPracticeId,
        productId: testProductId,
        name: 'Test Item 3',
        sku: `ITEM3-${Date.now()}`,
        unit: 'unit',
      },
    });

    // Set initial inventory
    await prisma.locationInventory.create({
      data: {
        locationId: testLocationId,
        itemId: item2.id,
        quantity: 5,
      },
    });

    await prisma.locationInventory.create({
      data: {
        locationId: testLocationId,
        itemId: item3.id,
        quantity: 15,
      },
    });

    // Create session
    const { id: sessionId } = await inventoryService.createStockCountSession(
      ctx,
      testLocationId,
      'Multi-item count'
    );

    // Add lines with different variances
    await inventoryService.addCountLine(ctx, sessionId, testItemId, 8); // -2 variance
    await inventoryService.addCountLine(ctx, sessionId, item2.id, 7); // +2 variance
    await inventoryService.addCountLine(ctx, sessionId, item3.id, 15); // 0 variance

    // Complete with adjustments
    const result = await inventoryService.completeStockCount(ctx, sessionId, true);

    // Should only adjust items with non-zero variance
    expect(result.adjustedItems).toBe(2);

    // Verify all inventories
    const inv1 = await prisma.locationInventory.findUnique({
      where: { locationId_itemId: { locationId: testLocationId, itemId: testItemId } },
    });
    expect(inv1?.quantity).toBe(8);

    const inv2 = await prisma.locationInventory.findUnique({
      where: { locationId_itemId: { locationId: testLocationId, itemId: item2.id } },
    });
    expect(inv2?.quantity).toBe(7);

    const inv3 = await prisma.locationInventory.findUnique({
      where: { locationId_itemId: { locationId: testLocationId, itemId: item3.id } },
    });
    expect(inv3?.quantity).toBe(15);

    // Verify adjustments were created only for items with variance
    const adjustments = await prisma.stockAdjustment.findMany({
      where: {
        practiceId: testPracticeId,
        locationId: testLocationId,
        reason: 'Stock Count',
      },
    });
    expect(adjustments).toHaveLength(2);
  });

  it('should allow completing without applying adjustments', async () => {
    // Create session and add line
    const { id: sessionId } = await inventoryService.createStockCountSession(
      ctx,
      testLocationId,
      'Count without adjustment'
    );

    await inventoryService.addCountLine(ctx, sessionId, testItemId, 8);

    // Complete without adjustments
    const result = await inventoryService.completeStockCount(ctx, sessionId, false);

    expect(result.adjustedItems).toBe(0);

    // Verify inventory was NOT changed
    const inventory = await prisma.locationInventory.findUnique({
      where: {
        locationId_itemId: {
          locationId: testLocationId,
          itemId: testItemId,
        },
      },
    });
    expect(inventory?.quantity).toBe(10); // Still original value

    // Verify no stock adjustment was created
    const adjustment = await prisma.stockAdjustment.findFirst({
      where: {
        practiceId: testPracticeId,
        itemId: testItemId,
        locationId: testLocationId,
        reason: 'Stock Count',
      },
    });
    expect(adjustment).toBeNull();

    // Session should still be COMPLETED
    const session = await prisma.stockCountSession.findUnique({
      where: { id: sessionId },
    });
    expect(session?.status).toBe('COMPLETED');
  });

  it('should require at least one line to complete', async () => {
    // Create session without lines
    const { id: sessionId } = await inventoryService.createStockCountSession(
      ctx,
      testLocationId,
      'Empty count'
    );

    // Attempt to complete should fail
    await expect(
      inventoryService.completeStockCount(ctx, sessionId, true)
    ).rejects.toThrow(ValidationError);

    await expect(
      inventoryService.completeStockCount(ctx, sessionId, true)
    ).rejects.toThrow('must have at least one line');
  });

  it('should allow cancelling IN_PROGRESS session', async () => {
    // Create session
    const { id: sessionId } = await inventoryService.createStockCountSession(
      ctx,
      testLocationId,
      'Count to cancel'
    );

    await inventoryService.addCountLine(ctx, sessionId, testItemId, 8);

    // Cancel session
    await inventoryService.cancelStockCount(ctx, sessionId);

    // Verify session is CANCELLED
    const session = await prisma.stockCountSession.findUnique({
      where: { id: sessionId },
    });
    expect(session?.status).toBe('CANCELLED');

    // Verify inventory was NOT changed
    const inventory = await prisma.locationInventory.findUnique({
      where: {
        locationId_itemId: {
          locationId: testLocationId,
          itemId: testItemId,
        },
      },
    });
    expect(inventory?.quantity).toBe(10);

    // Should now be able to create a new session for the same location
    const { id: newSessionId } = await inventoryService.createStockCountSession(
      ctx,
      testLocationId,
      'New count after cancel'
    );

    expect(newSessionId).toBeDefined();
    expect(newSessionId).not.toBe(sessionId);
  });
});

