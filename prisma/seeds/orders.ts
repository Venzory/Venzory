import { PrismaClient, Practice, User, Item, PracticeSupplier, SupplierItem, Location, OrderStatus, GoodsReceiptStatus } from '@prisma/client';
import { randomInt, randomPrice, daysAgo } from './utils';

export async function seedOrders(
  prisma: PrismaClient,
  practice: Practice,
  users: { admin: User; staff: User },
  items: Item[],
  practiceSuppliers: PracticeSupplier[],
  supplierItems: SupplierItem[],
  locations: Location[]
) {
  console.log('📦 Creating orders and receipts...');

  // 1. Create Order Templates
  const template1 = await prisma.orderTemplate.create({
    data: {
      practiceId: practice.id,
      name: 'Weekly Consumables Order',
      description: 'Standard weekly order for consumable supplies',
      createdById: users.admin.id,
    },
  });

  const template2 = await prisma.orderTemplate.create({
    data: {
      practiceId: practice.id,
      name: 'Monthly PPE Restock',
      description: 'Monthly restock of personal protective equipment',
      createdById: users.staff.id,
    },
  });

  // Add items to templates
  const template1Items = items.slice(0, 8);
  for (const item of template1Items) {
    await prisma.orderTemplateItem.create({
      data: {
        templateId: template1.id,
        itemId: item.id,
        defaultQuantity: randomInt(5, 20),
        practiceSupplierId: item.defaultPracticeSupplierId,
      },
    });
  }

  const template2Items = items.slice(8, 15);
  for (const item of template2Items) {
    await prisma.orderTemplateItem.create({
      data: {
        templateId: template2.id,
        itemId: item.id,
        defaultQuantity: randomInt(10, 30),
        practiceSupplierId: item.defaultPracticeSupplierId,
      },
    });
  }

  // 2. Create Orders & Receipts

  // Order 1: Sent (Awaiting Receipt)
  const order1 = await prisma.order.create({
    data: {
      practiceId: practice.id,
      practiceSupplierId: practiceSuppliers[0].id,
      reference: 'PO-2024-001',
      status: OrderStatus.SENT,
      notes: 'Urgent order for low stock items',
      createdById: users.staff.id,
      sentAt: daysAgo(3),
      createdAt: daysAgo(3),
    },
  });

  const order1Items = items.slice(0, 5);
  for (const item of order1Items) {
    const supplierItem = supplierItems.find(
      (si) => si.itemId === item.id && si.practiceSupplierId === practiceSuppliers[0].id
    );
    await prisma.orderItem.create({
      data: {
        orderId: order1.id,
        itemId: item.id,
        quantity: randomInt(10, 50),
        unitPrice: supplierItem?.unitPrice || randomPrice(10, 100),
      },
    });
  }

  // Order 2: Partially Received (Critical Flow)
  const order2 = await prisma.order.create({
    data: {
      practiceId: practice.id,
      practiceSupplierId: practiceSuppliers[1].id,
      reference: 'PO-2024-002',
      status: OrderStatus.PARTIALLY_RECEIVED,
      notes: 'Regular monthly order - Partial delivery',
      createdById: users.admin.id,
      sentAt: daysAgo(7),
      createdAt: daysAgo(7),
    },
  });

  const order2Items = items.slice(5, 12); // 7 items
  for (const item of order2Items) {
    const supplierItem = supplierItems.find(
      (si) => si.itemId === item.id && si.practiceSupplierId === practiceSuppliers[1].id
    );
    await prisma.orderItem.create({
      data: {
        orderId: order2.id,
        itemId: item.id,
        quantity: randomInt(10, 50),
        unitPrice: supplierItem?.unitPrice || randomPrice(10, 100),
      },
    });
  }

  // Receipt for Order 2 (Partial)
  const receipt1 = await prisma.goodsReceipt.create({
    data: {
      practiceId: practice.id,
      orderId: order2.id,
      practiceSupplierId: practiceSuppliers[1].id,
      locationId: locations[0].id,
      status: GoodsReceiptStatus.CONFIRMED,
      notes: 'Partial delivery - remaining items on backorder',
      receivedAt: daysAgo(5),
      createdById: users.staff.id,
      createdAt: daysAgo(5),
    },
  });

  // Receive 4 out of 7 items, and some partially
  const order2ItemsForReceipt = await prisma.orderItem.findMany({
    where: { orderId: order2.id },
    take: 4,
  });

  for (const orderItem of order2ItemsForReceipt) {
    const receivedQty = Math.floor(orderItem.quantity * 0.7); // Receive 70% of ordered qty
    await prisma.goodsReceiptLine.create({
      data: {
        receiptId: receipt1.id,
        itemId: orderItem.itemId,
        quantity: receivedQty,
        notes: `Partial receipt - ordered ${orderItem.quantity}`,
      },
    });
  }

  // Order 3: Fully Received
  const order3 = await prisma.order.create({
    data: {
      practiceId: practice.id,
      practiceSupplierId: practiceSuppliers[2].id,
      reference: 'PO-2024-003',
      status: OrderStatus.RECEIVED,
      notes: 'Lab supplies restock',
      createdById: users.staff.id,
      sentAt: daysAgo(14),
      receivedAt: daysAgo(12),
      createdAt: daysAgo(14),
    },
  });

  const order3Items = items.slice(12, 18);
  for (const item of order3Items) {
    const supplierItem = supplierItems.find(
      (si) => si.itemId === item.id && si.practiceSupplierId === practiceSuppliers[2].id
    );
    await prisma.orderItem.create({
      data: {
        orderId: order3.id,
        itemId: item.id,
        quantity: randomInt(10, 50),
        unitPrice: supplierItem?.unitPrice || randomPrice(10, 100),
      },
    });
  }

  // Receipt for Order 3 (Full)
  const receipt2 = await prisma.goodsReceipt.create({
    data: {
      practiceId: practice.id,
      orderId: order3.id,
      practiceSupplierId: practiceSuppliers[2].id,
      locationId: locations[0].id,
      status: GoodsReceiptStatus.CONFIRMED,
      notes: 'Complete delivery received',
      receivedAt: daysAgo(12),
      createdById: users.admin.id,
      createdAt: daysAgo(12),
    },
  });

  const order3ItemsForReceipt = await prisma.orderItem.findMany({
    where: { orderId: order3.id },
  });

  for (const orderItem of order3ItemsForReceipt) {
    await prisma.goodsReceiptLine.create({
      data: {
        receiptId: receipt2.id,
        itemId: orderItem.itemId,
        quantity: orderItem.quantity, // Full receipt
        notes: `Full receipt`,
      },
    });
  }

  // Order 4: Draft
  const order4 = await prisma.order.create({
    data: {
      practiceId: practice.id,
      practiceSupplierId: practiceSuppliers[0].id,
      reference: null, // No reference yet
      status: OrderStatus.DRAFT,
      notes: 'Draft order for review',
      createdById: users.staff.id,
      createdAt: daysAgo(1),
    },
  });

  const order4Items = items.slice(18, 23);
  for (const item of order4Items) {
    const supplierItem = supplierItems.find(
      (si) => si.itemId === item.id && si.practiceSupplierId === practiceSuppliers[0].id
    );
    await prisma.orderItem.create({
      data: {
        orderId: order4.id,
        itemId: item.id,
        quantity: randomInt(5, 30),
        unitPrice: supplierItem?.unitPrice || randomPrice(10, 100),
      },
    });
  }

  console.log(`   - Created 4 orders (Draft, Sent, Partial, Received)`);
  console.log(`   - Created 2 goods receipts`);
}

