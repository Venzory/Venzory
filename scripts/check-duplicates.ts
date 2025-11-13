/**
 * Pre-Migration Duplicate Detection Script
 * 
 * This script checks for existing duplicate data that would violate
 * the unique constraints we're about to add:
 * 
 * 1. Item: practiceId + name (all rows)
 * 2. Item: practiceId + sku (where sku IS NOT NULL)
 * 3. Location: practiceId + code (where code IS NOT NULL)
 * 
 * If duplicates are found, the script exits with code 1 and provides
 * detailed information to help resolve the issues.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateItem {
  practiceId: string;
  name?: string;
  sku?: string | null;
  ids: string[];
  count: number;
}

interface DuplicateLocation {
  practiceId: string;
  code: string;
  ids: string[];
  count: number;
}

async function checkItemNameDuplicates(): Promise<DuplicateItem[]> {
  console.log('🔍 Checking for duplicate Item names (practiceId + name)...');
  
  const duplicates = await prisma.$queryRaw<DuplicateItem[]>`
    SELECT 
      "practiceId",
      "name",
      array_agg("id") as ids,
      COUNT(*) as count
    FROM "Item"
    GROUP BY "practiceId", "name"
    HAVING COUNT(*) > 1
    ORDER BY count DESC, "practiceId", "name"
  `;
  
  return duplicates;
}

async function checkItemSkuDuplicates(): Promise<DuplicateItem[]> {
  console.log('🔍 Checking for duplicate Item SKUs (practiceId + sku WHERE sku IS NOT NULL)...');
  
  const duplicates = await prisma.$queryRaw<DuplicateItem[]>`
    SELECT 
      "practiceId",
      "sku",
      array_agg("id") as ids,
      COUNT(*) as count
    FROM "Item"
    WHERE "sku" IS NOT NULL
    GROUP BY "practiceId", "sku"
    HAVING COUNT(*) > 1
    ORDER BY count DESC, "practiceId", "sku"
  `;
  
  return duplicates;
}

async function checkLocationCodeDuplicates(): Promise<DuplicateLocation[]> {
  console.log('🔍 Checking for duplicate Location codes (practiceId + code WHERE code IS NOT NULL)...');
  
  const duplicates = await prisma.$queryRaw<DuplicateLocation[]>`
    SELECT 
      "practiceId",
      "code",
      array_agg("id") as ids,
      COUNT(*) as count
    FROM "Location"
    WHERE "code" IS NOT NULL
    GROUP BY "practiceId", "code"
    HAVING COUNT(*) > 1
    ORDER BY count DESC, "practiceId", "code"
  `;
  
  return duplicates;
}

function printItemNameDuplicates(duplicates: DuplicateItem[]): void {
  console.log('\n❌ DUPLICATE ITEM NAMES FOUND:');
  console.log('━'.repeat(80));
  
  for (const dup of duplicates) {
    console.log(`\n  Practice ID: ${dup.practiceId}`);
    console.log(`  Item Name:   "${dup.name}"`);
    console.log(`  Count:       ${dup.count} duplicates`);
    console.log(`  Item IDs:    ${dup.ids.join(', ')}`);
  }
  
  console.log('\n📝 SQL to inspect these items:');
  console.log('━'.repeat(80));
  for (const dup of duplicates) {
    console.log(`SELECT * FROM "Item" WHERE "practiceId" = '${dup.practiceId}' AND "name" = '${dup.name?.replace(/'/g, "''")}';`);
  }
  
  console.log('\n💡 To fix: Rename duplicate items or delete unwanted ones.');
  console.log('   Example: UPDATE "Item" SET "name" = \'New Name\' WHERE "id" = \'item-id-here\';');
}

function printItemSkuDuplicates(duplicates: DuplicateItem[]): void {
  console.log('\n❌ DUPLICATE ITEM SKUs FOUND:');
  console.log('━'.repeat(80));
  
  for (const dup of duplicates) {
    console.log(`\n  Practice ID: ${dup.practiceId}`);
    console.log(`  Item SKU:    "${dup.sku}"`);
    console.log(`  Count:       ${dup.count} duplicates`);
    console.log(`  Item IDs:    ${dup.ids.join(', ')}`);
  }
  
  console.log('\n📝 SQL to inspect these items:');
  console.log('━'.repeat(80));
  for (const dup of duplicates) {
    console.log(`SELECT * FROM "Item" WHERE "practiceId" = '${dup.practiceId}' AND "sku" = '${dup.sku?.replace(/'/g, "''")}';`);
  }
  
  console.log('\n💡 To fix: Change duplicate SKUs, set to NULL, or delete unwanted items.');
  console.log('   Example: UPDATE "Item" SET "sku" = \'NEW-SKU\' WHERE "id" = \'item-id-here\';');
  console.log('   Or:      UPDATE "Item" SET "sku" = NULL WHERE "id" = \'item-id-here\';');
}

function printLocationCodeDuplicates(duplicates: DuplicateLocation[]): void {
  console.log('\n❌ DUPLICATE LOCATION CODES FOUND:');
  console.log('━'.repeat(80));
  
  for (const dup of duplicates) {
    console.log(`\n  Practice ID:   ${dup.practiceId}`);
    console.log(`  Location Code: "${dup.code}"`);
    console.log(`  Count:         ${dup.count} duplicates`);
    console.log(`  Location IDs:  ${dup.ids.join(', ')}`);
  }
  
  console.log('\n📝 SQL to inspect these locations:');
  console.log('━'.repeat(80));
  for (const dup of duplicates) {
    console.log(`SELECT * FROM "Location" WHERE "practiceId" = '${dup.practiceId}' AND "code" = '${dup.code.replace(/'/g, "''")}';`);
  }
  
  console.log('\n💡 To fix: Change duplicate codes, set to NULL, or delete unwanted locations.');
  console.log('   Example: UPDATE "Location" SET "code" = \'NEW-CODE\' WHERE "id" = \'location-id-here\';');
  console.log('   Or:      UPDATE "Location" SET "code" = NULL WHERE "id" = \'location-id-here\';');
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         PRE-MIGRATION DUPLICATE DETECTION SCRIPT                           ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
  
  let hasErrors = false;
  
  try {
    // Check Item name duplicates
    const itemNameDuplicates = await checkItemNameDuplicates();
    if (itemNameDuplicates.length > 0) {
      hasErrors = true;
      printItemNameDuplicates(itemNameDuplicates);
    } else {
      console.log('  ✅ No duplicate Item names found');
    }
    
    // Check Item SKU duplicates
    const itemSkuDuplicates = await checkItemSkuDuplicates();
    if (itemSkuDuplicates.length > 0) {
      hasErrors = true;
      printItemSkuDuplicates(itemSkuDuplicates);
    } else {
      console.log('  ✅ No duplicate Item SKUs found');
    }
    
    // Check Location code duplicates
    const locationCodeDuplicates = await checkLocationCodeDuplicates();
    if (locationCodeDuplicates.length > 0) {
      hasErrors = true;
      printLocationCodeDuplicates(locationCodeDuplicates);
    } else {
      console.log('  ✅ No duplicate Location codes found');
    }
    
    console.log('\n' + '═'.repeat(80));
    
    if (hasErrors) {
      console.log('❌ DUPLICATES DETECTED - Migration cannot proceed');
      console.log('   Please resolve the duplicate data issues listed above.');
      console.log('   After fixing, re-run this script to verify.');
      console.log('═'.repeat(80));
      process.exit(1);
    } else {
      console.log('✅ SUCCESS - No duplicates found!');
      console.log('   Safe to proceed with migration.');
      console.log('═'.repeat(80));
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR running duplicate detection:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

