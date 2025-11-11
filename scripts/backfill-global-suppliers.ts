/**
 * Backfill Script: Migrate existing Supplier records to GlobalSupplier + PracticeSupplier
 * 
 * Strategy: 1:1 mapping - each Supplier becomes one GlobalSupplier + one PracticeSupplier link
 * 
 * Usage:
 *   npm run backfill:suppliers           - Run in dry-run mode (preview only)
 *   npm run backfill:suppliers --apply   - Actually execute the migration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationStats {
  suppliersProcessed: number;
  globalSuppliersCreated: number;
  practiceSupplierLinksCreated: number;
  errors: Array<{ supplierId: string; error: string }>;
}

async function main() {
  const isDryRun = !process.argv.includes('--apply');
  
  console.log('🔄 Global Supplier Backfill Script');
  console.log('═'.repeat(60));
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (preview only)' : '✅ APPLY (will modify database)'}`);
  console.log('═'.repeat(60));
  console.log();

  const stats: MigrationStats = {
    suppliersProcessed: 0,
    globalSuppliersCreated: 0,
    practiceSupplierLinksCreated: 0,
    errors: [],
  };

  try {
    // Fetch all existing suppliers
    console.log('📊 Fetching existing suppliers...');
    const suppliers = await prisma.supplier.findMany({
      include: {
        practice: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`✓ Found ${suppliers.length} supplier(s) to migrate\n`);

    if (suppliers.length === 0) {
      console.log('ℹ️  No suppliers found. Nothing to migrate.');
      return;
    }

    // Check if any suppliers have already been migrated
    const existingMigrations = await prisma.practiceSupplier.findMany({
      where: {
        migratedFromSupplierId: {
          not: null,
        },
      },
    });

    if (existingMigrations.length > 0) {
      console.log(`⚠️  Warning: Found ${existingMigrations.length} existing PracticeSupplier record(s) with migration tracking.`);
      console.log('   This suggests the migration may have been run before.');
      console.log('   Continuing will create duplicate entries for any suppliers not yet migrated.\n');
      
      if (!isDryRun) {
        console.log('   Press Ctrl+C to cancel, or the script will continue in 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log('📝 Processing suppliers...\n');

    for (const supplier of suppliers) {
      stats.suppliersProcessed++;
      
      try {
        // Check if this supplier was already migrated
        const existingLink = await prisma.practiceSupplier.findFirst({
          where: {
            migratedFromSupplierId: supplier.id,
          },
        });

        if (existingLink) {
          console.log(`⏭️  Supplier "${supplier.name}" (${supplier.id}) already migrated, skipping...`);
          continue;
        }

        console.log(`Processing: "${supplier.name}" from practice "${supplier.practice.name}"`);
        console.log(`  Supplier ID: ${supplier.id}`);
        console.log(`  Practice ID: ${supplier.practiceId}`);
        
        if (isDryRun) {
          console.log(`  [DRY RUN] Would create GlobalSupplier:`);
          console.log(`    - Name: ${supplier.name}`);
          console.log(`    - Email: ${supplier.email || 'N/A'}`);
          console.log(`    - Phone: ${supplier.phone || 'N/A'}`);
          console.log(`    - Website: ${supplier.website || 'N/A'}`);
          console.log(`  [DRY RUN] Would create PracticeSupplier link`);
          console.log(`    - Practice: ${supplier.practice.name}`);
          console.log(`    - Migration tracking: ${supplier.id}`);
        } else {
          // Execute migration in a transaction
          await prisma.$transaction(async (tx) => {
            // Create GlobalSupplier
            const globalSupplier = await tx.globalSupplier.create({
              data: {
                name: supplier.name,
                email: supplier.email,
                phone: supplier.phone,
                website: supplier.website,
                notes: supplier.notes,
              },
            });

            stats.globalSuppliersCreated++;
            console.log(`  ✓ Created GlobalSupplier: ${globalSupplier.id}`);

            // Create PracticeSupplier link
            const practiceSupplier = await tx.practiceSupplier.create({
              data: {
                practiceId: supplier.practiceId,
                globalSupplierId: globalSupplier.id,
                migratedFromSupplierId: supplier.id,
                // Default values for practice-specific fields
                isPreferred: false,
                isBlocked: false,
              },
            });

            stats.practiceSupplierLinksCreated++;
            console.log(`  ✓ Created PracticeSupplier link: ${practiceSupplier.id}`);
          });
        }
        
        console.log();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`  ❌ Error processing supplier "${supplier.name}": ${errorMessage}\n`);
        stats.errors.push({
          supplierId: supplier.id,
          error: errorMessage,
        });
      }
    }

    // Summary
    console.log('═'.repeat(60));
    console.log('📊 Migration Summary');
    console.log('═'.repeat(60));
    console.log(`Suppliers processed:           ${stats.suppliersProcessed}`);
    
    if (isDryRun) {
      console.log(`\n[DRY RUN] Would create:`);
      console.log(`  - GlobalSuppliers:           ${stats.suppliersProcessed - stats.errors.length}`);
      console.log(`  - PracticeSupplier links:    ${stats.suppliersProcessed - stats.errors.length}`);
    } else {
      console.log(`GlobalSuppliers created:       ${stats.globalSuppliersCreated}`);
      console.log(`PracticeSupplier links:        ${stats.practiceSupplierLinksCreated}`);
    }
    
    console.log(`Errors encountered:            ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      stats.errors.forEach(({ supplierId, error }) => {
        console.log(`  - Supplier ${supplierId}: ${error}`);
      });
    }

    if (isDryRun) {
      console.log('\n💡 To apply these changes, run:');
      console.log('   npm run backfill:suppliers -- --apply');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

