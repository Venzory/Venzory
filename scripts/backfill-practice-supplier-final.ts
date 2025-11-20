// Final pass to ensure all items have a PracticeSupplier link
// Run with: npx tsx scripts/backfill-practice-supplier-final.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting PracticeSupplier final backfill...');

  try {
    // Since Supplier model is removed, we can only look at items that might have lost their link
    // In the new schema, Item links to PracticeSupplier via defaultPracticeSupplierId
    
    // Find items without a default supplier
    const itemsWithoutSupplier = await prisma.item.findMany({
      where: {
        defaultPracticeSupplierId: null,
      },
      select: {
        id: true,
        name: true,
        practiceId: true,
      }
    });

    console.log(`ℹ️ Found ${itemsWithoutSupplier.length} items without a default supplier.`);
    console.log('⚠️ Cannot automatically infer supplier without legacy data. Manual review required if needed.');

  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
