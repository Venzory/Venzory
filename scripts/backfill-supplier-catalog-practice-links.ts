/**
 * Backfill SupplierCatalog entries with practiceSupplierId
 * 
 * This script migrates existing SupplierCatalog entries to reference PracticeSupplier
 * instead of just the legacy Supplier model.
 * 
 * Strategy:
 * - For each SupplierCatalog entry:
 *   1. Find the PracticeSupplier via Supplier.id -> PracticeSupplier.migratedFromSupplierId
 *   2. Update SupplierCatalog.practiceSupplierId with the mapped ID
 * 
 * Usage:
 *   npm run backfill:supplier-catalog          # Dry run (preview only)
 *   npm run backfill:supplier-catalog -- --apply  # Apply changes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BackfillStats {
  totalCatalogEntries: number;
  successfullyMapped: number;
  alreadyMigrated: number;
  unmapped: Array<{
    catalogId: string;
    supplierId: string;
    productId: string;
    reason: string;
  }>;
}

async function backfillSupplierCatalogPracticeLinks(dryRun: boolean = true): Promise<BackfillStats> {
  console.log('\n🔄 Backfilling SupplierCatalog with PracticeSupplier links...');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes will be made)' : '✅ APPLY (changes will be saved)'}\n`);

  const stats: BackfillStats = {
    totalCatalogEntries: 0,
    successfullyMapped: 0,
    alreadyMigrated: 0,
    unmapped: [],
  };

  try {
    // Fetch all SupplierCatalog entries
    const catalogEntries = await prisma.supplierCatalog.findMany({
      include: {
        supplier: true,
        product: true,
      },
    });

    stats.totalCatalogEntries = catalogEntries.length;
    console.log(`📦 Found ${stats.totalCatalogEntries} SupplierCatalog entries\n`);

    // Process each catalog entry
    for (const catalog of catalogEntries) {
      // Skip if already migrated
      if (catalog.practiceSupplierId) {
        stats.alreadyMigrated++;
        continue;
      }

      // Find corresponding PracticeSupplier via migratedFromSupplierId
      const practiceSupplier = await prisma.practiceSupplier.findFirst({
        where: {
          migratedFromSupplierId: catalog.supplierId,
        },
        include: {
          globalSupplier: true,
          practice: true,
        },
      });

      if (!practiceSupplier) {
        stats.unmapped.push({
          catalogId: catalog.id,
          supplierId: catalog.supplierId,
          productId: catalog.productId,
          reason: 'No PracticeSupplier found with migratedFromSupplierId matching this supplierId',
        });
        console.log(`  ⚠️  Cannot map catalog entry ${catalog.id} (supplier: ${catalog.supplier.name})`);
        continue;
      }

      // Update the catalog entry with practiceSupplierId
      if (!dryRun) {
        await prisma.supplierCatalog.update({
          where: { id: catalog.id },
          data: {
            practiceSupplierId: practiceSupplier.id,
          },
        });
      }

      stats.successfullyMapped++;
      
      if (stats.successfullyMapped <= 5) {
        // Show first 5 mappings as examples
        console.log(`  ✓ Mapped: ${catalog.supplier.name} → ${practiceSupplier.globalSupplier.name} (Practice: ${practiceSupplier.practice.name})`);
      } else if (stats.successfullyMapped === 6) {
        console.log(`  ... (showing first 5 mappings)`);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total SupplierCatalog entries:    ${stats.totalCatalogEntries}`);
    console.log(`Already migrated (skipped):       ${stats.alreadyMigrated}`);
    console.log(`Successfully mapped:              ${stats.successfullyMapped}`);
    console.log(`Unmapped (need attention):        ${stats.unmapped.length}`);
    console.log('='.repeat(60));

    if (stats.unmapped.length > 0) {
      console.log('\n⚠️  UNMAPPED ENTRIES:\n');
      stats.unmapped.forEach((entry, idx) => {
        console.log(`${idx + 1}. Catalog ID: ${entry.catalogId}`);
        console.log(`   Supplier ID: ${entry.supplierId}`);
        console.log(`   Product ID: ${entry.productId}`);
        console.log(`   Reason: ${entry.reason}\n`);
      });
    }

    if (dryRun) {
      console.log('\n💡 This was a dry run. No changes were made.');
      console.log('   To apply these changes, run with --apply flag:\n');
      console.log('   npm run backfill:supplier-catalog -- --apply\n');
    } else {
      console.log('\n✅ Backfill completed successfully!\n');
    }

  } catch (error) {
    console.error('\n❌ Error during backfill:', error);
    throw error;
  }

  return stats;
}

// Main execution
const args = process.argv.slice(2);
const isDryRun = !args.includes('--apply');

backfillSupplierCatalogPracticeLinks(isDryRun)
  .then((stats) => {
    process.exit(stats.unmapped.length > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

