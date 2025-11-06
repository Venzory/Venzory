import { PrismaClient, PracticeRole, MembershipStatus, OrderStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash('Demo1234!', 12);

  const practice = await prisma.practice.upsert({
    where: { slug: 'demo-practice' },
    update: {},
    create: {
      name: 'Demo Practice',
      slug: 'demo-practice',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'demo@remcura.test' },
    update: {
      name: 'Demo Admin',
      passwordHash,
    },
    create: {
      email: 'demo@remcura.test',
      name: 'Demo Admin',
      passwordHash,
    },
  });

  await prisma.practiceUser.upsert({
    where: {
      practiceId_userId: {
        practiceId: practice.id,
        userId: user.id,
      },
    },
    update: {
      role: PracticeRole.ADMIN,
      status: MembershipStatus.ACTIVE,
      acceptedAt: new Date(),
    },
    create: {
      practiceId: practice.id,
      userId: user.id,
      role: PracticeRole.ADMIN,
      status: MembershipStatus.ACTIVE,
      invitedAt: new Date(),
      acceptedAt: new Date(),
    },
  });

  // Create a second user without practice membership for testing invite flow
  await prisma.user.upsert({
    where: { email: 'existing@remcura.test' },
    update: {
      name: 'Existing User',
      passwordHash,
    },
    create: {
      email: 'existing@remcura.test',
      name: 'Existing User',
      passwordHash,
    },
  });

  // Create multiple locations
  const mainLocation = await prisma.location.upsert({
    where: { id: 'seed-main-location' },
    update: {
      name: 'Main Storage',
      practiceId: practice.id,
    },
    create: {
      id: 'seed-main-location',
      practiceId: practice.id,
      name: 'Main Storage',
      code: 'MAIN',
      description: 'Primary storage for general consumables.',
    },
  });

  const secondLocation = await prisma.location.upsert({
    where: { id: 'seed-second-location' },
    update: {
      name: 'Treatment Room',
      practiceId: practice.id,
    },
    create: {
      id: 'seed-second-location',
      practiceId: practice.id,
      name: 'Treatment Room',
      code: 'TR1',
      description: 'Treatment room supplies.',
    },
  });

  // Create multiple suppliers
  const supplier1 = await prisma.supplier.upsert({
    where: { id: 'seed-supplier' },
    update: {
      practiceId: practice.id,
      name: 'MedSupplies Co.',
    },
    create: {
      id: 'seed-supplier',
      practiceId: practice.id,
      name: 'MedSupplies Co.',
      email: 'orders@medsupplies.test',
      phone: '+31 6 1234 5678',
      website: 'https://medsupplies.test',
      notes: 'Preferred supplier for gloves and syringes.',
    },
  });

  const supplier2 = await prisma.supplier.upsert({
    where: { id: 'seed-supplier-2' },
    update: {
      practiceId: practice.id,
      name: 'PharmaDirect',
    },
    create: {
      id: 'seed-supplier-2',
      practiceId: practice.id,
      name: 'PharmaDirect',
      email: 'sales@pharmadirect.test',
      phone: '+31 6 9876 5432',
      website: 'https://pharmadirect.test',
      notes: 'Fast delivery for urgent supplies.',
    },
  });

  // Create items with varied stock levels (some low, some adequate)
  const itemsData = [
    {
      id: 'seed-item-gloves',
      name: 'Nitrile Gloves',
      sku: 'GLV-100',
      unit: 'box',
      description: 'Powder-free nitrile gloves (100 pcs).',
      supplierId: supplier1.id,
      quantity: 8, // LOW STOCK (below reorder point of 20)
      reorderPoint: 20,
      reorderQuantity: 100,
      unitPrice: 12.50,
    },
    {
      id: 'seed-item-syringes',
      name: 'Syringes 5ml',
      sku: 'SYR-5ML',
      unit: 'pack',
      description: 'Sterile single-use syringes (5ml, pack of 50).',
      supplierId: supplier1.id,
      quantity: 15, // LOW STOCK (below reorder point of 25)
      reorderPoint: 25,
      reorderQuantity: 50,
      unitPrice: 18.00,
    },
    {
      id: 'seed-item-bandages',
      name: 'Elastic Bandages',
      sku: 'BND-EL',
      unit: 'roll',
      description: 'Standard elastic medical bandages.',
      supplierId: supplier1.id,
      quantity: 45, // ADEQUATE STOCK
      reorderPoint: 20,
      reorderQuantity: 50,
      unitPrice: 3.25,
    },
    {
      id: 'seed-item-gauze',
      name: 'Sterile Gauze Pads',
      sku: 'GAU-4X4',
      unit: 'pack',
      description: '4x4 inch sterile gauze pads (100 pack).',
      supplierId: supplier2.id,
      quantity: 5, // LOW STOCK (below reorder point of 15)
      reorderPoint: 15,
      reorderQuantity: 30,
      unitPrice: 8.99,
    },
    {
      id: 'seed-item-alcohol',
      name: 'Alcohol Wipes',
      sku: 'ALC-100',
      unit: 'box',
      description: 'Isopropyl alcohol prep pads (100 count).',
      supplierId: supplier2.id,
      quantity: 30, // ADEQUATE STOCK
      reorderPoint: 20,
      reorderQuantity: 50,
      unitPrice: 6.50,
    },
    {
      id: 'seed-item-masks',
      name: 'Surgical Masks',
      sku: 'MSK-50',
      unit: 'box',
      description: 'Disposable 3-ply surgical masks (50 pack).',
      supplierId: supplier2.id,
      quantity: 12, // LOW STOCK (below reorder point of 30)
      reorderPoint: 30,
      reorderQuantity: 100,
      unitPrice: 9.75,
    },
  ];

  const createdItems: any[] = [];

  for (const itemData of itemsData) {
    const item = await prisma.item.upsert({
      where: { id: itemData.id },
      update: {
        name: itemData.name,
        description: itemData.description,
        sku: itemData.sku,
        unit: itemData.unit,
        practiceId: practice.id,
        defaultSupplierId: itemData.supplierId,
      },
      create: {
        id: itemData.id,
        practiceId: practice.id,
        name: itemData.name,
        description: itemData.description,
        sku: itemData.sku,
        unit: itemData.unit,
        defaultSupplierId: itemData.supplierId,
      },
    });

    createdItems.push({ ...item, ...itemData });

    // Create inventory at main location
    await prisma.locationInventory.upsert({
      where: {
        locationId_itemId: {
          locationId: mainLocation.id,
          itemId: item.id,
        },
      },
      update: {
        quantity: itemData.quantity,
        reorderPoint: itemData.reorderPoint,
        reorderQuantity: itemData.reorderQuantity,
      },
      create: {
        locationId: mainLocation.id,
        itemId: item.id,
        quantity: itemData.quantity,
        reorderPoint: itemData.reorderPoint,
        reorderQuantity: itemData.reorderQuantity,
      },
    });

    // Add supplier item pricing
    await prisma.supplierItem.upsert({
      where: {
        supplierId_itemId: {
          supplierId: itemData.supplierId,
          itemId: item.id,
        },
      },
      update: {
        unitPrice: itemData.unitPrice,
        currency: 'EUR',
        minOrderQty: 1,
      },
      create: {
        supplierId: itemData.supplierId,
        itemId: item.id,
        unitPrice: itemData.unitPrice,
        currency: 'EUR',
        minOrderQty: 1,
      },
    });
  }

  // Create orders with different statuses
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Draft order
  const draftOrder = await prisma.order.upsert({
    where: { id: 'seed-order-draft' },
    update: {
      practiceId: practice.id,
      supplierId: supplier1.id,
      status: OrderStatus.DRAFT,
      createdById: user.id,
      createdAt: threeDaysAgo,
    },
    create: {
      id: 'seed-order-draft',
      practiceId: practice.id,
      supplierId: supplier1.id,
      status: OrderStatus.DRAFT,
      createdById: user.id,
      reference: 'PO-2024-001',
      notes: 'Restocking low inventory items',
      createdAt: threeDaysAgo,
    },
  });

  await prisma.orderItem.upsert({
    where: {
      orderId_itemId: {
        orderId: draftOrder.id,
        itemId: 'seed-item-gloves',
      },
    },
    update: {
      quantity: 100,
      unitPrice: 12.50,
    },
    create: {
      orderId: draftOrder.id,
      itemId: 'seed-item-gloves',
      quantity: 100,
      unitPrice: 12.50,
      notes: 'Urgent - running low',
    },
  });

  await prisma.orderItem.upsert({
    where: {
      orderId_itemId: {
        orderId: draftOrder.id,
        itemId: 'seed-item-syringes',
      },
    },
    update: {
      quantity: 50,
      unitPrice: 18.00,
    },
    create: {
      orderId: draftOrder.id,
      itemId: 'seed-item-syringes',
      quantity: 50,
      unitPrice: 18.00,
    },
  });

  // Sent order
  const sentOrder = await prisma.order.upsert({
    where: { id: 'seed-order-sent' },
    update: {
      practiceId: practice.id,
      supplierId: supplier2.id,
      status: OrderStatus.SENT,
      createdById: user.id,
      sentAt: oneWeekAgo,
      createdAt: oneWeekAgo,
    },
    create: {
      id: 'seed-order-sent',
      practiceId: practice.id,
      supplierId: supplier2.id,
      status: OrderStatus.SENT,
      createdById: user.id,
      reference: 'PO-2024-002',
      notes: 'Monthly restock',
      sentAt: oneWeekAgo,
      expectedAt: now,
      createdAt: oneWeekAgo,
    },
  });

  await prisma.orderItem.upsert({
    where: {
      orderId_itemId: {
        orderId: sentOrder.id,
        itemId: 'seed-item-gauze',
      },
    },
    update: {
      quantity: 30,
      unitPrice: 8.99,
    },
    create: {
      orderId: sentOrder.id,
      itemId: 'seed-item-gauze',
      quantity: 30,
      unitPrice: 8.99,
    },
  });

  await prisma.orderItem.upsert({
    where: {
      orderId_itemId: {
        orderId: sentOrder.id,
        itemId: 'seed-item-masks',
      },
    },
    update: {
      quantity: 100,
      unitPrice: 9.75,
    },
    create: {
      orderId: sentOrder.id,
      itemId: 'seed-item-masks',
      quantity: 100,
      unitPrice: 9.75,
    },
  });

  // Received order (recent)
  const receivedOrder1 = await prisma.order.upsert({
    where: { id: 'seed-order-received-1' },
    update: {
      practiceId: practice.id,
      supplierId: supplier1.id,
      status: OrderStatus.RECEIVED,
      createdById: user.id,
      sentAt: twoWeeksAgo,
      receivedAt: oneWeekAgo,
      createdAt: twoWeeksAgo,
    },
    create: {
      id: 'seed-order-received-1',
      practiceId: practice.id,
      supplierId: supplier1.id,
      status: OrderStatus.RECEIVED,
      createdById: user.id,
      reference: 'PO-2024-003',
      sentAt: twoWeeksAgo,
      receivedAt: oneWeekAgo,
      createdAt: twoWeeksAgo,
    },
  });

  await prisma.orderItem.upsert({
    where: {
      orderId_itemId: {
        orderId: receivedOrder1.id,
        itemId: 'seed-item-bandages',
      },
    },
    update: {
      quantity: 50,
      unitPrice: 3.25,
    },
    create: {
      orderId: receivedOrder1.id,
      itemId: 'seed-item-bandages',
      quantity: 50,
      unitPrice: 3.25,
    },
  });

  // Second received order
  const receivedOrder2 = await prisma.order.upsert({
    where: { id: 'seed-order-received-2' },
    update: {
      practiceId: practice.id,
      supplierId: supplier2.id,
      status: OrderStatus.RECEIVED,
      createdById: user.id,
      createdAt: twoWeeksAgo,
    },
    create: {
      id: 'seed-order-received-2',
      practiceId: practice.id,
      supplierId: supplier2.id,
      status: OrderStatus.RECEIVED,
      createdById: user.id,
      reference: 'PO-2024-004',
      sentAt: twoWeeksAgo,
      receivedAt: oneWeekAgo,
      createdAt: twoWeeksAgo,
    },
  });

  await prisma.orderItem.upsert({
    where: {
      orderId_itemId: {
        orderId: receivedOrder2.id,
        itemId: 'seed-item-alcohol',
      },
    },
    update: {
      quantity: 50,
      unitPrice: 6.50,
    },
    create: {
      orderId: receivedOrder2.id,
      itemId: 'seed-item-alcohol',
      quantity: 50,
      unitPrice: 6.50,
    },
  });

  // Create stock adjustments
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  await prisma.stockAdjustment.upsert({
    where: { id: 'seed-adjustment-1' },
    update: {
      practiceId: practice.id,
      itemId: 'seed-item-gloves',
      locationId: mainLocation.id,
      quantity: -15,
      reason: 'Used',
      note: 'High usage this week',
      createdById: user.id,
      createdAt: twoDaysAgo,
    },
    create: {
      id: 'seed-adjustment-1',
      practiceId: practice.id,
      itemId: 'seed-item-gloves',
      locationId: mainLocation.id,
      quantity: -15,
      reason: 'Used',
      note: 'High usage this week',
      createdById: user.id,
      createdAt: twoDaysAgo,
    },
  });

  await prisma.stockAdjustment.upsert({
    where: { id: 'seed-adjustment-2' },
    update: {
      practiceId: practice.id,
      itemId: 'seed-item-syringes',
      locationId: mainLocation.id,
      quantity: -10,
      reason: 'Used',
      note: 'Normal consumption',
      createdById: user.id,
      createdAt: threeDaysAgo,
    },
    create: {
      id: 'seed-adjustment-2',
      practiceId: practice.id,
      itemId: 'seed-item-syringes',
      locationId: mainLocation.id,
      quantity: -10,
      reason: 'Used',
      note: 'Normal consumption',
      createdById: user.id,
      createdAt: threeDaysAgo,
    },
  });

  await prisma.stockAdjustment.upsert({
    where: { id: 'seed-adjustment-3' },
    update: {
      practiceId: practice.id,
      itemId: 'seed-item-bandages',
      locationId: mainLocation.id,
      quantity: 50,
      reason: 'Received',
      note: 'Delivery from PO-2024-003',
      createdById: user.id,
      createdAt: fourDaysAgo,
    },
    create: {
      id: 'seed-adjustment-3',
      practiceId: practice.id,
      itemId: 'seed-item-bandages',
      locationId: mainLocation.id,
      quantity: 50,
      reason: 'Received',
      note: 'Delivery from PO-2024-003',
      createdById: user.id,
      createdAt: fourDaysAgo,
    },
  });

  await prisma.stockAdjustment.upsert({
    where: { id: 'seed-adjustment-4' },
    update: {
      practiceId: practice.id,
      itemId: 'seed-item-gauze',
      locationId: mainLocation.id,
      quantity: -8,
      reason: 'Used',
      note: 'Treatment supplies',
      createdById: user.id,
      createdAt: fiveDaysAgo,
    },
    create: {
      id: 'seed-adjustment-4',
      practiceId: practice.id,
      itemId: 'seed-item-gauze',
      locationId: mainLocation.id,
      quantity: -8,
      reason: 'Used',
      note: 'Treatment supplies',
      createdById: user.id,
      createdAt: fiveDaysAgo,
    },
  });

  await prisma.stockAdjustment.upsert({
    where: { id: 'seed-adjustment-5' },
    update: {
      practiceId: practice.id,
      itemId: 'seed-item-masks',
      locationId: mainLocation.id,
      quantity: -5,
      reason: 'Waste',
      note: 'Damaged packaging',
      createdById: user.id,
      createdAt: oneWeekAgo,
    },
    create: {
      id: 'seed-adjustment-5',
      practiceId: practice.id,
      itemId: 'seed-item-masks',
      locationId: mainLocation.id,
      quantity: -5,
      reason: 'Waste',
      note: 'Damaged packaging',
      createdById: user.id,
      createdAt: oneWeekAgo,
    },
  });

  console.log('✅ Seed data created successfully!');
  console.log(`📦 Created ${itemsData.length} items (4 low stock, 2 adequate)`);
  console.log('📋 Created 4 orders (1 draft, 1 sent, 2 received)');
  console.log('📊 Created 5 stock adjustments');
  console.log('💰 Added unit prices for stock value calculation');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seed error', error);
    await prisma.$disconnect();
    process.exit(1);
  });
