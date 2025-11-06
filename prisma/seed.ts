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

  // Create canonical Products first (GS1 foundation)
  // Mix of GS1 products (with GTIN) and non-GS1 products
  const productsData = [
    {
      id: 'seed-product-gloves',
      gtin: '08712345678906',  // Example GTIN for Nitrile Gloves
      brand: 'MediCare',
      name: 'Nitrile Gloves',
      description: 'Powder-free nitrile examination gloves.',
      isGs1Product: true,
    },
    {
      id: 'seed-product-syringes',
      gtin: '08723456789017',  // Example GTIN for Syringes
      brand: 'SafeMed',
      name: 'Sterile Syringes 5ml',
      description: 'Single-use sterile syringes with luer lock.',
      isGs1Product: true,
    },
    {
      id: 'seed-product-bandages',
      gtin: null,  // Non-GS1 product
      brand: 'Generic',
      name: 'Elastic Bandages',
      description: 'Standard elastic medical bandages.',
      isGs1Product: false,
    },
    {
      id: 'seed-product-gauze',
      gtin: '08734567890128',  // Example GTIN for Gauze
      brand: 'CurePlus',
      name: 'Sterile Gauze Pads',
      description: 'Sterile gauze pads for wound care.',
      isGs1Product: true,
    },
    {
      id: 'seed-product-alcohol',
      gtin: null,  // Non-GS1 product
      brand: 'CleanCare',
      name: 'Alcohol Prep Pads',
      description: 'Isopropyl alcohol prep pads for disinfection.',
      isGs1Product: false,
    },
    {
      id: 'seed-product-masks',
      gtin: '08745678901239',  // Example GTIN for Masks
      brand: 'SafeGuard',
      name: 'Surgical Face Masks',
      description: '3-ply disposable surgical masks.',
      isGs1Product: true,
    },
  ];

  for (const productData of productsData) {
    await prisma.product.upsert({
      where: { id: productData.id },
      update: {
        name: productData.name,
        brand: productData.brand,
        description: productData.description,
        gtin: productData.gtin,
        isGs1Product: productData.isGs1Product,
      },
      create: {
        id: productData.id,
        name: productData.name,
        brand: productData.brand,
        description: productData.description,
        gtin: productData.gtin,
        isGs1Product: productData.isGs1Product,
        gs1VerificationStatus: 'UNVERIFIED',
      },
    });
  }

  // Create items with varied stock levels (some low, some adequate)
  // Items are practice-specific views of Products
  const itemsData = [
    {
      id: 'seed-item-gloves',
      productId: 'seed-product-gloves',
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
      productId: 'seed-product-syringes',
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
      productId: 'seed-product-bandages',
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
      productId: 'seed-product-gauze',
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
      productId: 'seed-product-alcohol',
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
      productId: 'seed-product-masks',
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
        productId: itemData.productId,
        defaultSupplierId: itemData.supplierId,
      },
      create: {
        id: itemData.id,
        practiceId: practice.id,
        productId: itemData.productId,
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

  // Create SupplierCatalog entries to demonstrate multi-supplier capability
  // Some products available from multiple suppliers with different prices
  await prisma.supplierCatalog.upsert({
    where: {
      supplierId_productId: {
        supplierId: supplier1.id,
        productId: 'seed-product-gloves',
      },
    },
    update: {
      supplierSku: 'MED-GLV-100',
      unitPrice: 12.50,
      currency: 'EUR',
      minOrderQty: 10,
      integrationType: 'MANUAL',
      isActive: true,
    },
    create: {
      supplierId: supplier1.id,
      productId: 'seed-product-gloves',
      supplierSku: 'MED-GLV-100',
      unitPrice: 12.50,
      currency: 'EUR',
      minOrderQty: 10,
      integrationType: 'MANUAL',
      isActive: true,
    },
  });

  // Same gloves from supplier2, different price (demonstrating multi-supplier)
  await prisma.supplierCatalog.upsert({
    where: {
      supplierId_productId: {
        supplierId: supplier2.id,
        productId: 'seed-product-gloves',
      },
    },
    update: {
      supplierSku: 'PD-GLOVES-NIT',
      unitPrice: 11.75,
      currency: 'EUR',
      minOrderQty: 20,
      integrationType: 'API',
      integrationConfig: {
        apiEndpoint: 'https://api.pharmadirect.test/catalog',
        syncFrequency: 'daily',
      },
      isActive: true,
    },
    create: {
      supplierId: supplier2.id,
      productId: 'seed-product-gloves',
      supplierSku: 'PD-GLOVES-NIT',
      unitPrice: 11.75,
      currency: 'EUR',
      minOrderQty: 20,
      integrationType: 'API',
      integrationConfig: {
        apiEndpoint: 'https://api.pharmadirect.test/catalog',
        syncFrequency: 'daily',
      },
      isActive: true,
    },
  });

  // Add catalog entries for other products
  const catalogEntries = [
    { supplierId: supplier1.id, productId: 'seed-product-syringes', sku: 'MED-SYR-5ML', price: 18.00 },
    { supplierId: supplier1.id, productId: 'seed-product-bandages', sku: 'MED-BND-EL', price: 3.25 },
    { supplierId: supplier2.id, productId: 'seed-product-gauze', sku: 'PD-GAUZE-4X4', price: 8.99 },
    { supplierId: supplier2.id, productId: 'seed-product-alcohol', sku: 'PD-ALC-100', price: 6.50 },
    { supplierId: supplier2.id, productId: 'seed-product-masks', sku: 'PD-MASK-3PLY', price: 9.75 },
  ];

  for (const entry of catalogEntries) {
    await prisma.supplierCatalog.upsert({
      where: {
        supplierId_productId: {
          supplierId: entry.supplierId,
          productId: entry.productId,
        },
      },
      update: {
        supplierSku: entry.sku,
        unitPrice: entry.price,
        currency: 'EUR',
        minOrderQty: 1,
        integrationType: 'MANUAL',
        isActive: true,
      },
      create: {
        supplierId: entry.supplierId,
        productId: entry.productId,
        supplierSku: entry.sku,
        unitPrice: entry.price,
        currency: 'EUR',
        minOrderQty: 1,
        integrationType: 'MANUAL',
        isActive: true,
      },
    });
  }

  console.log('✅ Seed data created successfully!');
  console.log(`📦 Created ${productsData.length} canonical Products (4 GS1, 2 non-GS1)`);
  console.log(`🏥 Created ${itemsData.length} practice Items (4 low stock, 2 adequate)`);
  console.log('🔗 Created 7 SupplierCatalog entries (one product from multiple suppliers)');
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
