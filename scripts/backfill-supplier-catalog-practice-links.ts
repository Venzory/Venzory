// Script to ensure SupplierCatalog entries are linked correctly via PracticeSupplier
// Run with: npx tsx scripts/backfill-supplier-catalog-practice-links.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting SupplierCatalog backfill...');

  try {
    // In the new schema, SupplierCatalog links to PracticeSupplier
    // We can verify integrity
    
    const catalogEntries = await prisma.supplierCatalog.findMany({
      include: {
        practiceSupplier: true,
        product: true,
      },
    });

    console.log(`ℹ️ Found ${catalogEntries.length} catalog entries.`);
    
    // Check for any orphans (should be enforced by FKs but good to verify)
    const orphans = catalogEntries.filter(entry => !entry.practiceSupplier);
    
    if (orphans.length > 0) {
        console.warn(`⚠️ Found ${orphans.length} orphaned catalog entries.`);
    } else {
        console.log('✅ All catalog entries are correctly linked.');
    }

  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
