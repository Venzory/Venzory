import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Dropping _prisma_migrations table...');
  try {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "_prisma_migrations";`);
    console.log('Dropped _prisma_migrations table.');
  } catch (e) {
    console.error('Error dropping table:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

