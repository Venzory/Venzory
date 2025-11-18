import { PrismaClient, PracticeRole, OrderStatus, GoodsReceiptStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// Helper functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPrice(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomElement<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.activityLog.deleteMany();
  await prisma.goodsReceiptLine.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.orderTemplateItem.deleteMany();
  await prisma.orderTemplate.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.supplierItem.deleteMany();
  await prisma.supplierCatalog.deleteMany();
  await prisma.item.deleteMany();
  await prisma.location.deleteMany();
  await prisma.practiceSupplier.deleteMany();
  await prisma.globalSupplier.deleteMany();
  await prisma.product.deleteMany();
  await prisma.practiceUser.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.practice.deleteMany();

  // Create Global Suppliers
  console.log('🏢 Creating global suppliers...');
  const globalSuppliers = await Promise.all([
    prisma.globalSupplier.create({
      data: {
        name: 'Remka Medical',
        slug: 'remka-medical',
        website: 'https://remka.nl',
        contactEmail: 'orders@remka.nl',
        contactPhone: '+31 20 123 4567',
        street: 'Hoofdweg 123',
        city: 'Amsterdam',
        postalCode: '1012 AB',
        country: 'Netherlands',
        isActive: true,
      },
    }),
    prisma.globalSupplier.create({
      data: {
        name: 'Medical Supplies NL',
        slug: 'medical-supplies-nl',
        website: 'https://medicalsupplies.nl',
        contactEmail: 'info@medicalsupplies.nl',
        contactPhone: '+31 30 987 6543',
        street: 'Kerkstraat 45',
        city: 'Utrecht',
        postalCode: '3511 AB',
        country: 'Netherlands',
        isActive: true,
      },
    }),
    prisma.globalSupplier.create({
      data: {
        name: 'DemoLab Supplies',
        slug: 'demolab-supplies',
        website: 'https://demolab.com',
        contactEmail: 'sales@demolab.com',
        contactPhone: '+31 10 555 1234',
        street: 'Industrieweg 78',
        city: 'Rotterdam',
        postalCode: '3012 CD',
        country: 'Netherlands',
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${globalSuppliers.length} global suppliers`);

  // Create Practice
  console.log('🏥 Creating practice...');
  const practice = await prisma.practice.create({
    data: {
      name: 'Demo Veterinary Clinic',
      slug: 'demo-vet-clinic',
      street: 'Dierenweg 12',
      city: 'Amsterdam',
      postalCode: '1015 XY',
      country: 'Netherlands',
      contactEmail: 'info@demovet.nl',
      contactPhone: '+31 20 555 9999',
      onboardingCompletedAt: daysAgo(30),
    },
  });

  console.log(`✅ Created practice: ${practice.name}`);

  // Create Users
  console.log('👥 Creating users...');
  const passwordHash = await hash('password123', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@demovet.nl',
      name: 'Admin User',
      passwordHash,
      emailVerified: new Date(),
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@demovet.nl',
      name: 'Staff User',
      passwordHash,
      emailVerified: new Date(),
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      email: 'viewer@demovet.nl',
      name: 'Viewer User',
      passwordHash,
      emailVerified: new Date(),
    },
  });

  // Create Practice Memberships
  await Promise.all([
    prisma.practiceUser.create({
      data: {
        practiceId: practice.id,
        userId: adminUser.id,
        role: PracticeRole.ADMIN,
        status: 'ACTIVE',
      },
    }),
    prisma.practiceUser.create({
      data: {
        practiceId: practice.id,
        userId: staffUser.id,
        role: PracticeRole.STAFF,
        status: 'ACTIVE',
      },
    }),
    prisma.practiceUser.create({
      data: {
        practiceId: practice.id,
        userId: viewerUser.id,
        role: PracticeRole.VIEWER,
        status: 'ACTIVE',
      },
    }),
  ]);

  console.log(`✅ Created 3 users with memberships`);

  // Create Practice Suppliers (link practice to global suppliers)
  console.log('🔗 Creating practice suppliers...');
  const practiceSuppliers = await Promise.all([
    prisma.practiceSupplier.create({
      data: {
        practiceId: practice.id,
        globalSupplierId: globalSuppliers[0].id,
        customLabel: null, // Use global supplier name
        accountNumber: 'ACC-001-REMKA',
        orderingNotes: 'Standard delivery on Tuesdays and Thursdays',
        isPreferred: true,
        isBlocked: false,
      },
    }),
    prisma.practiceSupplier.create({
      data: {
        practiceId: practice.id,
        globalSupplierId: globalSuppliers[1].id,
        customLabel: 'MedSupply', // Custom label
        accountNumber: 'ACC-002-MEDSUP',
        orderingNotes: 'Minimum order €100',
        isPreferred: false,
        isBlocked: false,
      },
    }),
    prisma.practiceSupplier.create({
      data: {
        practiceId: practice.id,
        globalSupplierId: globalSuppliers[2].id,
        customLabel: null,
        accountNumber: 'ACC-003-DEMO',
        orderingNotes: null,
        isPreferred: false,
        isBlocked: false,
      },
    }),
  ]);

  console.log(`✅ Created ${practiceSuppliers.length} practice suppliers`);

  // Create Locations
  console.log('📍 Creating locations...');
  const locations = await Promise.all([
    prisma.location.create({
      data: {
        practiceId: practice.id,
        name: 'General Storage',
        description: 'Main storage area for general supplies',
        isActive: true,
      },
    }),
    prisma.location.create({
      data: {
        practiceId: practice.id,
        name: 'Consultation Room 1',
        description: 'Primary consultation room',
        isActive: true,
      },
    }),
    prisma.location.create({
      data: {
        practiceId: practice.id,
        name: 'Consultation Room 2',
        description: 'Secondary consultation room',
        isActive: true,
      },
    }),
    prisma.location.create({
      data: {
        practiceId: practice.id,
        name: 'Lab Room',
        description: 'Laboratory and testing area',
        isActive: true,
      },
    }),
    prisma.location.create({
      data: {
        practiceId: practice.id,
        name: 'Surgery Room',
        description: 'Surgical procedures room',
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${locations.length} locations`);

  // Create Products (for catalog)
  console.log('📦 Creating products...');
  const productData = [
    { name: 'Disposable Gloves (Box)', category: 'PPE', gtin: '8712345678901' },
    { name: 'Surgical Masks (Box)', category: 'PPE', gtin: '8712345678902' },
    { name: 'Syringes 5ml (Pack)', category: 'Consumables', gtin: '8712345678903' },
    { name: 'Syringes 10ml (Pack)', category: 'Consumables', gtin: '8712345678904' },
    { name: 'Needles 21G (Box)', category: 'Consumables', gtin: '8712345678905' },
    { name: 'Needles 23G (Box)', category: 'Consumables', gtin: '8712345678906' },
    { name: 'Bandages 5cm (Roll)', category: 'Wound Care', gtin: '8712345678907' },
    { name: 'Bandages 10cm (Roll)', category: 'Wound Care', gtin: '8712345678908' },
    { name: 'Gauze Pads (Pack)', category: 'Wound Care', gtin: '8712345678909' },
    { name: 'Alcohol Swabs (Box)', category: 'Disinfection', gtin: '8712345678910' },
    { name: 'Disinfectant Spray 500ml', category: 'Disinfection', gtin: '8712345678911' },
    { name: 'Hand Sanitizer 1L', category: 'Hygiene', gtin: '8712345678912' },
    { name: 'Surgical Drapes (Pack)', category: 'Surgery', gtin: '8712345678913' },
    { name: 'Scalpel Blades (Box)', category: 'Surgery', gtin: '8712345678914' },
    { name: 'Suture Kit', category: 'Surgery', gtin: '8712345678915' },
    { name: 'IV Catheters 20G (Box)', category: 'IV Supplies', gtin: '8712345678916' },
    { name: 'IV Catheters 22G (Box)', category: 'IV Supplies', gtin: '8712345678917' },
    { name: 'IV Fluid Set (Pack)', category: 'IV Supplies', gtin: '8712345678918' },
    { name: 'Blood Collection Tubes (Box)', category: 'Laboratory', gtin: '8712345678919' },
    { name: 'Urine Sample Containers (Pack)', category: 'Laboratory', gtin: '8712345678920' },
    { name: 'Microscope Slides (Box)', category: 'Laboratory', gtin: '8712345678921' },
    { name: 'Cotton Swabs (Pack)', category: 'Consumables', gtin: '8712345678922' },
    { name: 'Thermometer Covers (Box)', category: 'Consumables', gtin: '8712345678923' },
    { name: 'Exam Table Paper (Roll)', category: 'Consumables', gtin: '8712345678924' },
    { name: 'Waste Bags Biohazard (Roll)', category: 'Waste Management', gtin: '8712345678925' },
    { name: 'Sharps Container 2L', category: 'Waste Management', gtin: '8712345678926' },
    { name: 'Pet Carrier Small', category: 'Equipment', gtin: '8712345678927' },
    { name: 'Pet Carrier Large', category: 'Equipment', gtin: '8712345678928' },
    { name: 'Elizabethan Collar Small', category: 'Recovery', gtin: '8712345678929' },
    { name: 'Elizabethan Collar Large', category: 'Recovery', gtin: '8712345678930' },
  ];

  const products = await Promise.all(
    productData.map((p) =>
      prisma.product.create({
        data: {
          name: p.name,
          category: p.category,
          gtin: p.gtin,
          description: `High-quality ${p.name.toLowerCase()} for veterinary use`,
        },
      })
    )
  );

  console.log(`✅ Created ${products.length} products`);

  // Create Items
  console.log('📋 Creating items...');
  const items = await Promise.all(
    products.map((product, index) => {
      // Assign a default practice supplier (rotate through them)
      const defaultPracticeSupplier = practiceSuppliers[index % practiceSuppliers.length];

      return prisma.item.create({
        data: {
          practiceId: practice.id,
          name: product.name,
          sku: `SKU-${String(index + 1).padStart(4, '0')}`,
          unit: randomElement(['box', 'pack', 'roll', 'bottle', 'piece']),
          description: product.description,
          defaultPracticeSupplierId: defaultPracticeSupplier.id,
          isActive: true,
        },
      });
    })
  );

  console.log(`✅ Created ${items.length} items`);

  // Create Supplier Catalog entries
  console.log('📚 Creating supplier catalog...');
  const catalogEntries = [];
  for (const product of products) {
    // Each product is available from 1-2 suppliers
    const numSuppliers = randomInt(1, 2);
    const availableSuppliers = [...practiceSuppliers].sort(() => Math.random() - 0.5).slice(0, numSuppliers);

    for (const practiceSupplier of availableSuppliers) {
      const entry = await prisma.supplierCatalog.create({
        data: {
          productId: product.id,
          practiceSupplierId: practiceSupplier.id,
          supplierSku: `SUP-${practiceSupplier.id.slice(0, 4)}-${product.gtin?.slice(-6)}`,
          unitPrice: randomPrice(5, 150),
          currency: 'EUR',
          minOrderQuantity: randomInt(1, 5),
          packSize: randomInt(1, 100),
          isActive: true,
        },
      });
      catalogEntries.push(entry);
    }
  }

  console.log(`✅ Created ${catalogEntries.length} catalog entries`);

  // Create Supplier Items (linking items to practice suppliers with pricing)
  console.log('💰 Creating supplier items...');
  const supplierItems = [];
  for (const item of items) {
    // Each item is available from 1-3 suppliers
    const numSuppliers = randomInt(1, 3);
    const availableSuppliers = [...practiceSuppliers].sort(() => Math.random() - 0.5).slice(0, numSuppliers);

    for (const practiceSupplier of availableSuppliers) {
      const supplierItem = await prisma.supplierItem.create({
        data: {
          itemId: item.id,
          practiceSupplierId: practiceSupplier.id,
          supplierSku: `SI-${practiceSupplier.id.slice(0, 4)}-${item.sku}`,
          unitPrice: randomPrice(5, 150),
          currency: 'EUR',
          minOrderQuantity: randomInt(1, 5),
          leadTimeDays: randomInt(1, 7),
          isPreferred: practiceSupplier.id === item.defaultPracticeSupplierId,
        },
      });
      supplierItems.push(supplierItem);
    }
  }

  console.log(`✅ Created ${supplierItems.length} supplier items`);

  // Create Inventory
  console.log('📊 Creating inventory...');
  let inventoryCount = 0;
  for (const item of items) {
    // Each item has inventory in 2-4 locations
    const numLocations = randomInt(2, 4);
    const itemLocations = [...locations].sort(() => Math.random() - 0.5).slice(0, numLocations);

    for (const location of itemLocations) {
      await prisma.inventory.create({
        data: {
          itemId: item.id,
          locationId: location.id,
          quantity: randomInt(0, 100),
          reorderPoint: randomInt(5, 20),
        },
      });
      inventoryCount++;
    }
  }

  console.log(`✅ Created ${inventoryCount} inventory records`);

  // Create Order Templates
  console.log('📝 Creating order templates...');
  const template1 = await prisma.orderTemplate.create({
    data: {
      practiceId: practice.id,
      name: 'Weekly Consumables Order',
      description: 'Standard weekly order for consumable supplies',
      createdById: adminUser.id,
    },
  });

  const template2 = await prisma.orderTemplate.create({
    data: {
      practiceId: practice.id,
      name: 'Monthly PPE Restock',
      description: 'Monthly restock of personal protective equipment',
      createdById: staffUser.id,
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

  console.log(`✅ Created 2 order templates with items`);

  // Create Orders
  console.log('📦 Creating orders...');
  
  // Order 1: Sent order (awaiting receipt)
  const order1 = await prisma.order.create({
    data: {
      practiceId: practice.id,
      practiceSupplierId: practiceSuppliers[0].id,
      reference: 'PO-2024-001',
      status: OrderStatus.SENT,
      notes: 'Urgent order for low stock items',
      createdById: staffUser.id,
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
        currency: 'EUR',
      },
    });
  }

  // Order 2: Partially received order
  const order2 = await prisma.order.create({
    data: {
      practiceId: practice.id,
      practiceSupplierId: practiceSuppliers[1].id,
      reference: 'PO-2024-002',
      status: OrderStatus.PARTIALLY_RECEIVED,
      notes: 'Regular monthly order',
      createdById: adminUser.id,
      sentAt: daysAgo(7),
      createdAt: daysAgo(7),
    },
  });

  const order2Items = items.slice(5, 12);
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
        currency: 'EUR',
      },
    });
  }

  // Order 3: Received order
  const order3 = await prisma.order.create({
    data: {
      practiceId: practice.id,
      practiceSupplierId: practiceSuppliers[2].id,
      reference: 'PO-2024-003',
      status: OrderStatus.RECEIVED,
      notes: 'Lab supplies restock',
      createdById: staffUser.id,
      sentAt: daysAgo(14),
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
        currency: 'EUR',
      },
    });
  }

  // Order 4: Draft order
  const order4 = await prisma.order.create({
    data: {
      practiceId: practice.id,
      practiceSupplierId: practiceSuppliers[0].id,
      reference: null,
      status: OrderStatus.DRAFT,
      notes: 'Draft order for review',
      createdById: staffUser.id,
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
        currency: 'EUR',
      },
    });
  }

  console.log(`✅ Created 4 orders with items`);

  // Create Goods Receipts
  console.log('📥 Creating goods receipts...');

  // Receipt 1: Partial receipt for order 2
  const receipt1 = await prisma.goodsReceipt.create({
    data: {
      practiceId: practice.id,
      orderId: order2.id,
      practiceSupplierId: practiceSuppliers[1].id,
      locationId: locations[0].id,
      status: GoodsReceiptStatus.CONFIRMED,
      notes: 'Partial delivery - remaining items on backorder',
      receivedAt: daysAgo(5),
      createdById: staffUser.id,
      createdAt: daysAgo(5),
    },
  });

  // Add some items from order 2 (partial receipt)
  const order2ItemsForReceipt = await prisma.orderItem.findMany({
    where: { orderId: order2.id },
    take: 4,
  });

  for (const orderItem of order2ItemsForReceipt) {
    const receivedQty = Math.floor(orderItem.quantity * 0.7); // Receive 70%
    await prisma.goodsReceiptLine.create({
      data: {
        receiptId: receipt1.id,
        itemId: orderItem.itemId,
        orderItemId: orderItem.id,
        quantityOrdered: orderItem.quantity,
        quantityReceived: receivedQty,
        unitPrice: orderItem.unitPrice,
        currency: orderItem.currency || 'EUR',
      },
    });
  }

  // Receipt 2: Full receipt for order 3
  const receipt2 = await prisma.goodsReceipt.create({
    data: {
      practiceId: practice.id,
      orderId: order3.id,
      practiceSupplierId: practiceSuppliers[2].id,
      locationId: locations[0].id,
      status: GoodsReceiptStatus.CONFIRMED,
      notes: 'Complete delivery received',
      receivedAt: daysAgo(12),
      createdById: adminUser.id,
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
        orderItemId: orderItem.id,
        quantityOrdered: orderItem.quantity,
        quantityReceived: orderItem.quantity, // Full receipt
        unitPrice: orderItem.unitPrice,
        currency: orderItem.currency || 'EUR',
      },
    });
  }

  // Receipt 3: Standalone receipt (no order)
  const receipt3 = await prisma.goodsReceipt.create({
    data: {
      practiceId: practice.id,
      orderId: null,
      practiceSupplierId: practiceSuppliers[0].id,
      locationId: locations[1].id,
      status: GoodsReceiptStatus.CONFIRMED,
      notes: 'Emergency delivery - no PO',
      receivedAt: daysAgo(2),
      createdById: staffUser.id,
      createdAt: daysAgo(2),
    },
  });

  // Add some items to standalone receipt
  const standaloneItems = items.slice(23, 26);
  for (const item of standaloneItems) {
    const supplierItem = supplierItems.find(
      (si) => si.itemId === item.id && si.practiceSupplierId === practiceSuppliers[0].id
    );
    await prisma.goodsReceiptLine.create({
      data: {
        receiptId: receipt3.id,
        itemId: item.id,
        orderItemId: null,
        quantityOrdered: 0,
        quantityReceived: randomInt(5, 20),
        unitPrice: supplierItem?.unitPrice || randomPrice(10, 100),
        currency: 'EUR',
      },
    });
  }

  console.log(`✅ Created 3 goods receipts with lines`);

  // Create Activity Logs
  console.log('📝 Creating activity logs...');
  
  const activityLogs = [
    {
      practiceId: practice.id,
      userId: adminUser.id,
      action: 'ORDER_CREATED',
      entityType: 'Order',
      entityId: order1.id,
      description: `Created order ${order1.reference}`,
      metadata: { orderId: order1.id, reference: order1.reference },
      createdAt: daysAgo(3),
    },
    {
      practiceId: practice.id,
      userId: staffUser.id,
      action: 'ORDER_SENT',
      entityType: 'Order',
      entityId: order1.id,
      description: `Sent order ${order1.reference} to supplier`,
      metadata: { orderId: order1.id, supplierId: practiceSuppliers[0].id },
      createdAt: daysAgo(3),
    },
    {
      practiceId: practice.id,
      userId: adminUser.id,
      action: 'ORDER_CREATED',
      entityType: 'Order',
      entityId: order2.id,
      description: `Created order ${order2.reference}`,
      metadata: { orderId: order2.id, reference: order2.reference },
      createdAt: daysAgo(7),
    },
    {
      practiceId: practice.id,
      userId: staffUser.id,
      action: 'GOODS_RECEIPT_CREATED',
      entityType: 'GoodsReceipt',
      entityId: receipt1.id,
      description: 'Created goods receipt for partial delivery',
      metadata: { receiptId: receipt1.id, orderId: order2.id },
      createdAt: daysAgo(5),
    },
    {
      practiceId: practice.id,
      userId: adminUser.id,
      action: 'GOODS_RECEIPT_CONFIRMED',
      entityType: 'GoodsReceipt',
      entityId: receipt2.id,
      description: 'Confirmed goods receipt',
      metadata: { receiptId: receipt2.id, orderId: order3.id },
      createdAt: daysAgo(12),
    },
    {
      practiceId: practice.id,
      userId: staffUser.id,
      action: 'ITEM_CREATED',
      entityType: 'Item',
      entityId: items[0].id,
      description: `Created item ${items[0].name}`,
      metadata: { itemId: items[0].id, itemName: items[0].name },
      createdAt: daysAgo(30),
    },
    {
      practiceId: practice.id,
      userId: adminUser.id,
      action: 'LOCATION_CREATED',
      entityType: 'Location',
      entityId: locations[0].id,
      description: `Created location ${locations[0].name}`,
      metadata: { locationId: locations[0].id, locationName: locations[0].name },
      createdAt: daysAgo(30),
    },
    {
      practiceId: practice.id,
      userId: staffUser.id,
      action: 'TEMPLATE_CREATED',
      entityType: 'OrderTemplate',
      entityId: template1.id,
      description: `Created order template ${template1.name}`,
      metadata: { templateId: template1.id, templateName: template1.name },
      createdAt: daysAgo(20),
    },
  ];

  for (const log of activityLogs) {
    await prisma.activityLog.create({
      data: log,
    });
  }

  console.log(`✅ Created ${activityLogs.length} activity logs`);

  // Summary
  console.log('\n✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Global Suppliers: ${globalSuppliers.length}`);
  console.log(`   - Practice: 1`);
  console.log(`   - Users: 3`);
  console.log(`   - Practice Suppliers: ${practiceSuppliers.length}`);
  console.log(`   - Locations: ${locations.length}`);
  console.log(`   - Products: ${products.length}`);
  console.log(`   - Items: ${items.length}`);
  console.log(`   - Catalog Entries: ${catalogEntries.length}`);
  console.log(`   - Supplier Items: ${supplierItems.length}`);
  console.log(`   - Inventory Records: ${inventoryCount}`);
  console.log(`   - Order Templates: 2`);
  console.log(`   - Orders: 4`);
  console.log(`   - Goods Receipts: 3`);
  console.log(`   - Activity Logs: ${activityLogs.length}`);
  console.log('\n🎉 Database is ready for testing!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
