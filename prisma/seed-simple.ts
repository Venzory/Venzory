// Simplified seed file - legacy supplier code removed
// Run: npx tsx prisma/seed-simple.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with PracticeSupplier-only model...');
  
  // Add minimal seed data here if needed
  // All legacy Supplier references have been removed
  
  console.log('✓ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

