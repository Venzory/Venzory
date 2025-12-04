
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { AuditRepository } from '@/src/repositories/audit';
import { InventoryService, getInventoryService } from '@/src/services/inventory';
import { AuditService, getAuditService } from '@/src/services/audit';
import type { RequestContext } from '@/src/lib/context/request-context';
import * as ContextBuilder from '@/src/lib/context/context-builder';
import { updatePracticeSupplierAction } from '@/app/(clinic)/app/suppliers/actions';
import { ForbiddenError } from '@/src/domain/errors';

// Mock logger to avoid noise but allow debugging
vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn().mockImplementation((...args) => console.error('[MockLogger Error]', ...args)),
    warn: vi.fn(),
  },
}));

// Mock server-action-csrf
vi.mock('@/lib/server-action-csrf', () => ({
  verifyCsrfFromHeaders: vi.fn().mockResolvedValue(undefined),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Entrypoint Security & Hardening Tests', () => {
  let practice1Id: string;
  let user1Id: string;
  let location1Id: string;
  let item1Id: string;
  let product1Id: string;
  let practiceSupplierId: string;
  let ctx: RequestContext;

  beforeAll(async () => {
    // Setup test data
    const practice = await prisma.practice.create({
      data: { name: 'Security Test Practice', slug: 'sec-test-practice' },
    });
    practice1Id = practice.id;

    const user = await prisma.user.create({
      data: { email: 'sec-test@test.com', name: 'Security Tester' },
    });
    user1Id = user.id;

    const location = await prisma.location.create({
      data: { practiceId: practice1Id, name: 'Sec Loc', code: 'SL1' },
    });
    location1Id = location.id;

    const product = await prisma.product.create({
      data: { name: 'Sec Product', gtin: '99999999999999' },
    });
    product1Id = product.id;

    const item = await prisma.item.create({
      data: {
        practiceId: practice1Id,
        productId: product1Id,
        name: 'Sec Item',
        sku: 'SECITEM1',
      },
    });
    item1Id = item.id;

    // Inventory
    await prisma.locationInventory.create({
      data: {
        locationId: location1Id,
        itemId: item1Id,
        quantity: 50,
        reorderPoint: 10,
        reorderQuantity: 100,
      },
    });

    // Supplier
    const globalSupplier = await prisma.globalSupplier.create({
      data: { name: 'Sec Global Supplier' },
    });
    const practiceSupplier = await prisma.practiceSupplier.create({
      data: { practiceId: practice1Id, globalSupplierId: globalSupplier.id },
    });
    practiceSupplierId = practiceSupplier.id;

    // Context
    ctx = {
      userId: user1Id,
      userEmail: 'sec-test@test.com',
      userName: 'Security Tester',
      practiceId: practice1Id,
      role: 'STAFF',
      memberships: [],
      timestamp: new Date(),
      locationId: location1Id,
      allowedLocationIds: [location1Id],
    };
  });

  afterAll(async () => {
    // Cleanup
    await prisma.locationInventory.deleteMany({ where: { locationId: location1Id } });
    await prisma.item.deleteMany({ where: { id: item1Id } });
    await prisma.product.deleteMany({ where: { id: product1Id } });
    await prisma.location.deleteMany({ where: { id: location1Id } });
    await prisma.practiceSupplier.deleteMany({ where: { id: practiceSupplierId } });
    await prisma.globalSupplier.deleteMany({ where: { name: 'Sec Global Supplier' } });
    await prisma.auditLog.deleteMany({ where: { practiceId: practice1Id } });
    await prisma.user.deleteMany({ where: { id: user1Id } });
    await prisma.practice.deleteMany({ where: { id: practice1Id } });
  });

  describe('Audit Service - cleanupOldLogs', () => {
    it('should delete logs older than retention days', async () => {
      const auditService = getAuditService();
      const auditRepo = new AuditRepository();

      // Create old log
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days old

      await prisma.auditLog.create({
        data: {
          practiceId: practice1Id,
          entityType: 'Test',
          entityId: 'old-id',
          action: 'TEST',
          createdAt: oldDate,
        },
      });

      // Create new log
      await prisma.auditLog.create({
        data: {
          practiceId: practice1Id,
          entityType: 'Test',
          entityId: 'new-id',
          action: 'TEST',
          createdAt: new Date(),
        },
      });

      // Run cleanup (90 days retention)
      const result = await auditService.cleanupOldLogs(90);
      
      expect(result.deleted).toBeGreaterThanOrEqual(1);

      // Verify old log is gone
      const oldLog = await prisma.auditLog.findFirst({
        where: { entityId: 'old-id' },
      });
      expect(oldLog).toBeNull();

      // Verify new log exists
      const newLog = await prisma.auditLog.findFirst({
        where: { entityId: 'new-id' },
      });
      expect(newLog).not.toBeNull();
    });
  });

  describe('Inventory Service - getItemInventoryAtLocation', () => {
    it('should return correct inventory details', async () => {
      const inventoryService = getInventoryService();
      
      const result = await inventoryService.getItemInventoryAtLocation(
        ctx,
        item1Id,
        location1Id
      );

      expect(result).toEqual({
        quantity: 50,
        reorderPoint: 10,
        reorderQuantity: 100,
      });
    });

    it('should return defaults if no inventory record exists', async () => {
      const inventoryService = getInventoryService();
      
      // Create fake location ID for same practice (to avoid not found error if we checked location existence strictly, 
      // but service mostly queries locationInventory directly or via findItem)
      
      // We'll just query a non-existent item ID at the valid location
      // But note: if item doesn't exist, findItemById might throw? 
      // Service logic:
      // const inventory = await this.inventoryRepository.getLocationInventory(...)
      // return { quantity: inventory?.quantity ?? 0 ... }
      
      // It doesn't strictly check if item exists in this specific method, which is fine for this read-only endpoint
      // unless we want to enforce 404. The original route didn't enforce 404 on item existence, just returned 0s.
      
      const result = await inventoryService.getItemInventoryAtLocation(
        ctx,
        'non-existent-item',
        location1Id
      );

      expect(result).toEqual({
        quantity: 0,
        reorderPoint: null,
        reorderQuantity: null,
      });
    });

    it('should respect tenant isolation', async () => {
      const inventoryService = getInventoryService();
      
      // Context for a different practice
      const otherCtx: RequestContext = {
        ...ctx,
        practiceId: 'other-practice-id',
      };

      // Attempt to access item1 (which belongs to practice1)
      // The repository query filters by practiceId implicitly via relations or explicitly?
      // getLocationInventory does:
      // findUnique locationId_itemId
      // AND location.practiceId = practiceId (if enforced)
      // Let's check InventoryRepository.getLocationInventory implementation.
      // It typically selects from LocationInventory.
      
      // If we query by unique ID (locationId + itemId), but the location belongs to practice 1,
      // and we pass practice 2...
      // The query should fail or return null.
      // Note: LocationInventory doesn't usually store practiceId directly, it links to Location.
      // We need to ensure the query validates practiceId.
      
      const result = await inventoryService.getItemInventoryAtLocation(
        otherCtx,
        item1Id,
        location1Id
      );

      // Assuming repository enforces practiceId check on the location relation
      // If it returns null, we get 0s, which is safe (no data leaked).
      expect(result).toEqual({
        quantity: 0,
        reorderPoint: null,
        reorderQuantity: null,
      });
    });
  });

  describe('Supplier Actions - RBAC', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      // Re-mock logger and csrf
      vi.mock('@/lib/logger', () => ({
        default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
      }));
      vi.mock('@/lib/server-action-csrf', () => ({
        verifyCsrfFromHeaders: vi.fn().mockResolvedValue(undefined),
      }));
    });

    it('should allow STAFF to update supplier', async () => {
      const staffCtx = { ...ctx, role: 'STAFF' as const };
      vi.spyOn(ContextBuilder, 'buildRequestContext').mockResolvedValue(staffCtx);
      
      // Mock repository update to avoid actual DB write in action if possible, 
      // or let it run since we have test DB.
      // Let's let it run against DB for full integration.
      
      const formData = new FormData();
      formData.append('practiceSupplierId', practiceSupplierId);
      formData.append('customLabel', 'Updated Label');

      const result = await updatePracticeSupplierAction(null, formData);
      
      expect(result).toEqual({ success: 'Supplier settings updated successfully.' });
      
      // Verify DB
      const updated = await prisma.practiceSupplier.findUnique({
        where: { id: practiceSupplierId },
      });
      expect(updated?.customLabel).toBe('Updated Label');
    });

    it('should allow STAFF to update supplier (STAFF is the minimum role)', async () => {
      // STAFF is the lowest role and can update supplier settings
      const staffCtx = { ...ctx, role: 'STAFF' as const };
      vi.spyOn(ContextBuilder, 'buildRequestContext').mockResolvedValue(staffCtx);
      
      const formData = new FormData();
      formData.append('practiceSupplierId', practiceSupplierId);
      formData.append('customLabel', 'Staff Updated Label');

      // STAFF can update supplier settings
      const result = await updatePracticeSupplierAction(null, formData);
      
      expect(result).toEqual({ success: 'Supplier settings updated successfully.' });
    });
  });
});

