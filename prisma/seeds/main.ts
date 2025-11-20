import { PrismaClient } from '@prisma/client';
import { cleanDatabase } from './clean';
import { seedUsers } from './users';
import { seedCatalogs } from './catalogs';
import { seedInventory } from './inventory';
import { seedOrders } from './orders';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting modular seed...');

  try {
    await cleanDatabase(prisma);

    const { practice, users } = await seedUsers(prisma);
    const { practiceSuppliers, items, supplierItems } = await seedCatalogs(prisma, practice);
    const { locations } = await seedInventory(prisma, practice, items, users);
    await seedOrders(prisma, practice, users, items, practiceSuppliers, supplierItems, locations);

    console.log('\n🎉 Seed completed successfully!');
  } catch (e) {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

