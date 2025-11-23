
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { OrderService } from '@/src/services/orders/order-service';
import { OrderRepository } from '@/src/repositories/orders';
import { InventoryRepository } from '@/src/repositories/inventory';
import { UserRepository } from '@/src/repositories/users';
import { PracticeSupplierRepository } from '@/src/repositories/suppliers';
import { AuditService } from '@/src/services/audit/audit-service';
import { AuditRepository } from '@/src/repositories/audit';
import { DeliveryStrategyResolver } from '@/src/services/orders/delivery';
import type { RequestContext } from '@/src/lib/context/request-context';
import { createTestContext } from '@/src/lib/context/request-context';

// Mock external dependencies if needed
vi.mock('@/lib/notifications', () => ({
  checkAndCreateLowStockNotification: vi.fn(),
}));

describe('Order Templates - Supplier Integration Tests', () => {
  let service: OrderService;
  let testPracticeId: string;
  let testUserId: string;
  let testGlobalSupplierId: string;
  let testPracticeSupplierId: string;
  let testProductId: string;
  let testItemId: string;
  let ctx: RequestContext;

  beforeEach(async () => {
    // 1. Create Practice
    const practice = await prisma.practice.create({
      data: {
        name: 'Test Practice Template',
        slug: `test-practice-template-${Date.now()}`,
      },
    });
    testPracticeId = practice.id;

    // 2. Create User
    const user = await prisma.user.create({
      data: {
        email: `test-template-${Date.now()}@test.com`,
        name: 'Test User',
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

    // 3. Create Global Supplier
    const globalSupplier = await prisma.globalSupplier.create({
      data: {
        name: 'Test Global Supplier',
      },
    });
    testGlobalSupplierId = globalSupplier.id;

    // 4. Create Practice Supplier
    const practiceSupplier = await prisma.practiceSupplier.create({
      data: {
        practiceId: testPracticeId,
        globalSupplierId: testGlobalSupplierId,
        customLabel: 'My Custom Supplier',
      },
    });
    testPracticeSupplierId = practiceSupplier.id;

    // 5. Create Product
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        isGs1Product: false,
      },
    });
    testProductId = product.id;

    // 6. Create Item linked to Supplier
    const item = await prisma.item.create({
      data: {
        practiceId: testPracticeId,
        productId: testProductId,
        name: 'Test Item',
        defaultPracticeSupplierId: testPracticeSupplierId,
      },
    });
    testItemId = item.id;

    // Create PracticeSupplierItem pricing
    await prisma.practiceSupplierItem.create({
      data: {
        practiceSupplierId: testPracticeSupplierId,
        itemId: testItemId,
        unitPrice: 10.50,
        currency: 'EUR',
      },
    });

    // Setup Context
    ctx = createTestContext({
      userId: testUserId,
      practiceId: testPracticeId,
      role: 'STAFF',
    });

    // Initialize Service
    service = new OrderService(
      new OrderRepository(),
      new InventoryRepository(),
      new UserRepository(),
      new PracticeSupplierRepository(),
      new AuditService(new AuditRepository()),
      new DeliveryStrategyResolver()
    );
  });

  afterEach(async () => {
    // Cleanup
    await prisma.orderTemplate.deleteMany({ where: { practiceId: testPracticeId } });
    await prisma.order.deleteMany({ where: { practiceId: testPracticeId } });
    await prisma.practiceSupplierItem.deleteMany({ where: { itemId: testItemId } });
    await prisma.item.deleteMany({ where: { practiceId: testPracticeId } });
    await prisma.product.deleteMany({ where: { id: testProductId } });
    await prisma.practiceSupplier.deleteMany({ where: { practiceId: testPracticeId } });
    await prisma.globalSupplier.deleteMany({ where: { id: testGlobalSupplierId } });
    await prisma.practiceUser.deleteMany({ where: { practiceId: testPracticeId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.practice.deleteMany({ where: { id: testPracticeId } });
  });

  it('should create a template with items linked to practiceSupplierId', async () => {
    // Create Template with Item
    const template = await service.createTemplate(ctx, {
      name: 'Weekly Order',
      description: 'Standard weekly supplies',
      items: [
        {
          itemId: testItemId,
          defaultQuantity: 5,
          practiceSupplierId: testPracticeSupplierId,
        },
      ],
    });

    expect(template).toBeDefined();
    
    // Verify the join table has the correct practiceSupplierId
    // Note: createTemplate might not return deep relations depending on implementation
    // so we fetch it again to be sure
    const savedTemplate = await service.getTemplateById(ctx, template.id);
    expect(savedTemplate.items).toHaveLength(1);
    expect(savedTemplate.items[0].practiceSupplierId).toBe(testPracticeSupplierId);
    expect(savedTemplate.items[0].item.id).toBe(testItemId);
  });

  it('should create orders from template using the correct practiceSupplierId', async () => {
    // 1. Create Template
    const template = await service.createTemplate(ctx, {
      name: 'Weekly Order 2',
      description: null,
      items: [
        {
          itemId: testItemId,
          defaultQuantity: 10,
          practiceSupplierId: testPracticeSupplierId,
        },
      ],
    });

    // 2. Create Orders from Template
    // We need to construct the orderData as expected by createOrdersFromTemplate
    // In the real app, this comes from the UI (TemplatePreviewClient)
    const orderData = [
      {
        practiceSupplierId: testPracticeSupplierId,
        items: [
          {
            itemId: testItemId,
            quantity: 10,
            unitPrice: 10.50,
          },
        ],
      },
    ];

    const result = await service.createOrdersFromTemplate(ctx, template.id, orderData);

    expect(result.success).toBe(true);
    expect(result.orders).toHaveLength(1);
    
    const orderId = result.orders![0].id;

    // 3. Verify Order
    const order = await service.getOrderById(ctx, orderId);
    expect(order.practiceSupplierId).toBe(testPracticeSupplierId);
    expect(order.items).toHaveLength(1);
    expect(order.items![0].itemId).toBe(testItemId);
    expect(order.items![0].quantity).toBe(10);
    
    // Check that no legacy supplierId field exists (type check is implicit in TS, but runtime check)
    // @ts-ignore - checking for legacy field existence
    expect(order.supplierId).toBeUndefined();
  });

  it('should update template item to change practiceSupplierId', async () => {
    // 1. Create Template
    const template = await service.createTemplate(ctx, {
      name: 'Update Test',
      description: null,
      items: [
        {
          itemId: testItemId,
          defaultQuantity: 1,
          practiceSupplierId: null, // Initially no supplier
        },
      ],
    });

    // 2. Update Item
    // We need to fetch the template to get the item ID
    const savedTemplate = await service.getTemplateById(ctx, template.id);
    const savedItemId = savedTemplate.items[0].id;

    await service.updateTemplateItem(ctx, savedItemId, {
      defaultQuantity: 2,
      practiceSupplierId: testPracticeSupplierId,
    });

    // 3. Verify Update
    const updatedTemplate = await service.getTemplateById(ctx, template.id);
    expect(updatedTemplate.items[0].practiceSupplierId).toBe(testPracticeSupplierId);
    expect(updatedTemplate.items[0].defaultQuantity).toBe(2);
  });
});

