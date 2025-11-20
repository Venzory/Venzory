// Script to backfill GlobalSupplier from legacy Supplier data
// Run with: npx tsx scripts/backfill-global-suppliers.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting GlobalSupplier backfill...');

  try {
    // Fetch all existing PracticeSupplier which used to be Supplier
    // Since Supplier model is removed, we can't migrate from it.
    // Assuming this script is obsolete as Supplier model is gone.
    console.log('⚠️ Supplier model has been removed. Migration script is obsolete.');
    
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
