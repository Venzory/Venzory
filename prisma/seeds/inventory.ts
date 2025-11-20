import { PrismaClient, Practice, Item, User, StockCountStatus } from '@prisma/client';
import { randomInt, daysAgo } from './utils';

export async function seedInventory(
  prisma: PrismaClient,
  practice: Practice,
  items: Item[],
  users: { admin: User; staff: User }
) {
  console.log('📊 Creating inventory, adjustments, and counts...');

  // 1. Create Locations
  const locations = await Promise.all([
    prisma.location.create({
      data: {
        practiceId: practice.id,
        name: 'General Storage',
        code: 'GEN-STORE',
        description: 'Main storage area for general supplies',
      },
    }),
    prisma.location.create({
      data: {
        practiceId: practice.id,
        name: 'Consultation Room 1',
        code: 'CONSULT-1',
        description: 'Primary consultation room',
      },
    }),
    prisma.location.create({
      data: {
        practiceId: practice.id,
        name: 'Consultation Room 2',
        code: 'CONSULT-2',
        description: 'Secondary consultation room',
      },
    }),
    prisma.location.create({
      data: {
        practiceId: practice.id,
        name: 'Lab Room',
        code: 'LAB',
        description: 'Laboratory and testing area',
      },
    }),
    prisma.location.create({
      data: {
        practiceId: practice.id,
        name: 'Surgery Room',
        code: 'SURGERY',
        description: 'Surgical procedures room',
      },
    }),
  ]);

  // 2. Create Initial Inventory
  let inventoryCount = 0;
  for (const item of items) {
    const numLocations = randomInt(2, 4);
    const itemLocations = [...locations].sort(() => Math.random() - 0.5).slice(0, numLocations);

    for (const location of itemLocations) {
      await prisma.locationInventory.create({
        data: {
          itemId: item.id,
          locationId: location.id,
          quantity: randomInt(0, 100),
          reorderPoint: randomInt(5, 20),
          reorderQuantity: randomInt(10, 50),
        },
      });
      inventoryCount++;
    }
  }

  // 3. Create Stock Adjustments
  // Scenario: Damaged item
  await prisma.stockAdjustment.create({
    data: {
      itemId: items[0].id,
      locationId: locations[0].id,
      practiceId: practice.id,
      quantity: -2,
      reason: 'Damaged',
      note: 'Box crushed during transport',
      createdById: users.staff.id,
      createdAt: daysAgo(2),
    },
  });

  // Scenario: Found extra stock
  await prisma.stockAdjustment.create({
    data: {
      itemId: items[1].id,
      locationId: locations[1].id,
      practiceId: practice.id,
      quantity: 5,
      reason: 'Correction',
      note: 'Found extra box behind cabinet',
      createdById: users.admin.id,
      createdAt: daysAgo(5),
    },
  });

  // 4. Create Stock Count Sessions
  // Scenario A: Completed count with variance (Conflict)
  const conflictSession = await prisma.stockCountSession.create({
    data: {
      practiceId: practice.id,
      locationId: locations[0].id, // General Storage
      status: StockCountStatus.COMPLETED,
      createdById: users.staff.id,
      completedAt: daysAgo(1),
      notes: 'Monthly audit - discrepancies found',
    },
  });

  // Add lines with variance
  const conflictItems = items.slice(0, 5);
  for (const item of conflictItems) {
    // Get system quantity (simulated based on what we just seeded, though it might vary slightly due to adjustments)
    // For simplicity, we'll just assume a system quantity and create a variance
    const systemQty = 50; 
    const countedQty = Math.random() > 0.7 ? 48 : 50; // 30% chance of variance

    await prisma.stockCountLine.create({
      data: {
        sessionId: conflictSession.id,
        itemId: item.id,
        systemQuantity: systemQty,
        countedQuantity: countedQty,
        variance: countedQty - systemQty,
        notes: countedQty !== systemQty ? 'Missing items' : undefined,
      },
    });
  }

  // Scenario B: In Progress Count
  const activeSession = await prisma.stockCountSession.create({
    data: {
      practiceId: practice.id,
      locationId: locations[3].id, // Lab Room
      status: StockCountStatus.IN_PROGRESS,
      createdById: users.admin.id,
      notes: 'Spot check for lab supplies',
    },
  });

  console.log(`   - Created ${locations.length} locations`);
  console.log(`   - Created ${inventoryCount} inventory records`);
  console.log(`   - Created stock adjustments and count sessions`);

  return {
    locations,
  };
}

