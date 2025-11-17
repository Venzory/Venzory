/**
 * Practice Catalog Integration Tests
 * Tests the full flow of adding items from supplier catalog to My Items
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { InventoryService } from '@/src/services/inventory/inventory-service';
import { InventoryRepository } from '@/src/repositories/inventory';
import { ProductRepository } from '@/src/repositories/products';
import { LocationRepository } from '@/src/repositories/locations';
import { StockCountRepository } from '@/src/repositories/stock-count';
import { UserRepository } from '@/src/repositories/users';
import { AuditService } from '@/src/services/audit/audit-service';
import { AuditRepository } from '@/src/repositories/audit';
import type { RequestContext } from '@/src/lib/context/request-context';
import { createTestContext } from '@/src/lib/context/request-context';

const prisma = new PrismaClient();

describe('Practice Catalog Integration', () => {
  let testPracticeId: string;
  let testUserId: string;
  let testGlobalSupplierId: string;
  let testPracticeSupplierId: string;
  let testSupplierId: string;
  let testProductId: string;
  let ctx: RequestContext;
  let service: InventoryService;

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
      },
    });
    testUserId = user.id;

    // Link user to practice
    await prisma.practiceUser.create({
      data: {
        practiceId: testPracticeId,
        userId: testUserId,
        role: 'STAFF',
        status: 'ACTIVE',
      },
    });

    // Create legacy supplier (required for SupplierCatalog)
    const supplier = await prisma.supplier.create({
      data: {
        practiceId: testPracticeId,
        name: 'Test Legacy Supplier',
        email: 'legacy@test.com',
      },
    });
    testSupplierId = supplier.id;

    // Create global supplier
    const globalSupplier = await prisma.globalSupplier.create({
      data: {
        name: 'Test Global Supplier',
        email: 'supplier@test.com',
      },
    });
    testGlobalSupplierId = globalSupplier.id;

    // Link practice to global supplier
    const practiceSupplier = await prisma.practiceSupplier.create({
      data: {
        practiceId: testPracticeId,
        globalSupplierId: testGlobalSupplierId,
        customLabel: 'My Test Supplier',
      },
    });
    testPracticeSupplierId = practiceSupplier.id;

    // Create product
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        gtin: `${Date.now()}`,
        brand: 'Test Brand',
      },
    });
    testProductId = product.id;

    // Create supplier catalog entry
    await prisma.supplierCatalog.create({
      data: {
        supplierId: testSupplierId,
        practiceSupplierId: testPracticeSupplierId,
        productId: testProductId,
        supplierSku: 'SUP-001',
        unitPrice: 25.50,
        currency: 'EUR',
        minOrderQty: 1,
        integrationType: 'MANUAL',
      },
    });

    ctx = createTestContext({
      userId: testUserId,
      practiceId: testPracticeId,
      role: 'STAFF',
    });

    // Create service with real repositories
    service = new InventoryService(
      new InventoryRepository(),
      new ProductRepository(),
      new LocationRepository(),
      new StockCountRepository(),
      new UserRepository(),
      new AuditService(new AuditRepository())
    );
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.auditLog.deleteMany({
      where: { practiceId: testPracticeId },
    });
    await prisma.supplierCatalog.deleteMany({
      where: { practiceSupplierId: testPracticeSupplierId },
    });
    await prisma.item.deleteMany({
      where: { practiceId: testPracticeId },
    });
    await prisma.product.deleteMany({
      where: { id: testProductId },
    });
    await prisma.practiceSupplier.deleteMany({
      where: { id: testPracticeSupplierId },
    });
    await prisma.globalSupplier.deleteMany({
      where: { id: testGlobalSupplierId },
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

  it('should create item from supplier catalog with correct practice supplier link', async () => {
    // Add item from catalog
    const item = await service.addItemFromCatalog(ctx, {
      productId: testProductId,
      practiceSupplierId: testPracticeSupplierId,
      name: 'My Custom Item Name',
      sku: 'MY-SKU-001',
      unit: 'box',
      description: 'Test item from catalog',
    });

    // Verify item was created with correct fields
    expect(item.id).toBeDefined();
    expect(item.name).toBe('My Custom Item Name');
    expect(item.sku).toBe('MY-SKU-001');
    expect(item.unit).toBe('box');
    expect(item.description).toBe('Test item from catalog');
    expect(item.productId).toBe(testProductId);
    expect(item.defaultPracticeSupplierId).toBe(testPracticeSupplierId);

    // Verify relations are loaded
    expect(item.defaultPracticeSupplier).toBeDefined();
    expect(item.defaultPracticeSupplier?.id).toBe(testPracticeSupplierId);
    expect(item.defaultPracticeSupplier?.customLabel).toBe('My Test Supplier');
    expect(item.defaultPracticeSupplier?.globalSupplier.name).toBe('Test Global Supplier');

    // Verify item can be found by practice supplier filter
    const { items } = await service.findItems(ctx, {
      practiceSupplierId: testPracticeSupplierId,
    });

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(item.id);
    expect(items[0].defaultPracticeSupplierId).toBe(testPracticeSupplierId);
  });

  it('should prevent duplicate items for the same product', async () => {
    // Create first item
    await service.addItemFromCatalog(ctx, {
      productId: testProductId,
      practiceSupplierId: testPracticeSupplierId,
      name: 'First Item',
    });

    // Try to create second item for same product
    await expect(
      service.addItemFromCatalog(ctx, {
        productId: testProductId,
        practiceSupplierId: testPracticeSupplierId,
        name: 'Second Item',
      })
    ).rejects.toThrow('An item for this product already exists in your catalog');
  });

  it('should reject item creation if product not in practice supplier catalog', async () => {
    // Create another product not in catalog
    const otherProduct = await prisma.product.create({
      data: {
        name: 'Other Product',
        gtin: `${Date.now()}-other`,
      },
    });

    await expect(
      service.addItemFromCatalog(ctx, {
        productId: otherProduct.id,
        practiceSupplierId: testPracticeSupplierId,
        name: 'Invalid Item',
      })
    ).rejects.toThrow('This product is not available from the selected supplier');

    // Clean up
    await prisma.product.delete({ where: { id: otherProduct.id } });
  });

  it('should support filtering My Items by search and practice supplier', async () => {
    // Create multiple items
    await service.addItemFromCatalog(ctx, {
      productId: testProductId,
      practiceSupplierId: testPracticeSupplierId,
      name: 'Gloves Nitrile Blue',
      sku: 'GLV-001',
    });

    // Create another product and catalog entry
    const product2 = await prisma.product.create({
      data: {
        name: 'Test Product 2',
        gtin: `${Date.now()}-2`,
        brand: 'Brand 2',
      },
    });

    await prisma.supplierCatalog.create({
      data: {
        supplierId: testSupplierId,
        practiceSupplierId: testPracticeSupplierId,
        productId: product2.id,
        supplierSku: 'SUP-002',
        unitPrice: 15.00,
        currency: 'EUR',
        minOrderQty: 1,
        integrationType: 'MANUAL',
      },
    });

    await service.addItemFromCatalog(ctx, {
      productId: product2.id,
      practiceSupplierId: testPracticeSupplierId,
      name: 'Masks Surgical',
      sku: 'MSK-001',
    });

    // Test search filter
    const { items: searchResults } = await service.findItems(ctx, {
      search: 'Gloves',
    });
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].name).toBe('Gloves Nitrile Blue');

    // Test practice supplier filter
    const { items: supplierResults } = await service.findItems(ctx, {
      practiceSupplierId: testPracticeSupplierId,
    });
    expect(supplierResults).toHaveLength(2);

    // Clean up
    await prisma.item.deleteMany({
      where: { productId: product2.id },
    });
    await prisma.supplierCatalog.deleteMany({
      where: { productId: product2.id },
    });
    await prisma.product.delete({ where: { id: product2.id } });
  });
});

