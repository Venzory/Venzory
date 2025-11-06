import { PrismaClient, PracticeRole, MembershipStatus } from '@prisma/client';
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

  const location = await prisma.location.upsert({
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

  const supplier = await prisma.supplier.upsert({
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

  const items = [
    {
      id: 'seed-item-gloves',
      name: 'Nitrile Gloves',
      sku: 'GLV-100',
      unit: 'box',
      description: 'Powder-free nitrile gloves (100 pcs).',
    },
    {
      id: 'seed-item-syringes',
      name: 'Syringes 5ml',
      sku: 'SYR-5ML',
      unit: 'pack',
      description: 'Sterile single-use syringes (5ml, pack of 50).',
    },
    {
      id: 'seed-item-bandages',
      name: 'Elastic Bandages',
      sku: 'BND-EL',
      unit: 'roll',
      description: 'Standard elastic medical bandages.',
    },
  ];

  for (const item of items) {
    const createdItem = await prisma.item.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        description: item.description,
        sku: item.sku,
        unit: item.unit,
        practiceId: practice.id,
        defaultSupplierId: supplier.id,
      },
      create: {
        id: item.id,
        practiceId: practice.id,
        name: item.name,
        description: item.description,
        sku: item.sku,
        unit: item.unit,
        defaultSupplierId: supplier.id,
      },
    });

    await prisma.locationInventory.upsert({
      where: {
        locationId_itemId: {
          locationId: location.id,
          itemId: createdItem.id,
        },
      },
      update: {
        quantity: 50,
        reorderPoint: 20,
        reorderQuantity: 100,
      },
      create: {
        locationId: location.id,
        itemId: createdItem.id,
        quantity: 50,
        reorderPoint: 20,
        reorderQuantity: 100,
      },
    });
  }
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

