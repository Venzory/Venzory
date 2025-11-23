// Script to ensure SupplierItem entries are linked correctly via GlobalSupplier
// Run with: npx tsx scripts/backfill-supplier-catalog-practice-links.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting SupplierItem backfill...');

  try {
    // In the new schema, SupplierItem links to GlobalSupplier
    // We can verify integrity
    
    const catalogEntries = await prisma.supplierItem.findMany({
      include: {
        globalSupplier: true,
        product: true,
      },
    });

    console.log(`ℹ️ Found ${catalogEntries.length} supplier items.`);
    
    // Check for any orphans (should be enforced by FKs but good to verify)
    const orphans = catalogEntries.filter(entry => !entry.globalSupplier);
    
    if (orphans.length > 0) {
        console.warn(`⚠️ Found ${orphans.length} orphaned supplier items.`);
    } else {
        console.log('✅ All supplier items are correctly linked.');
    }

  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
