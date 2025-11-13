/**
 * Verify Unique Constraints Script
 * 
 * Checks that the unique constraints have been created in the database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface IndexInfo {
  schemaname: string;
  tablename: string;
  indexname: string;
  indexdef: string;
}

async function main() {
  console.log('🔍 Verifying unique constraints...\n');

  try {
    const indexes = await prisma.$queryRaw<IndexInfo[]>`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename IN ('Item', 'Location', 'PracticeUser')
        AND indexname LIKE '%_key'
      ORDER BY tablename, indexname
    `;

    console.log('Found unique constraints:\n');
    console.log('═'.repeat(80));

    const expectedConstraints = [
      'Item_practiceId_name_key',
      'Item_practiceId_sku_key',
      'Location_practiceId_code_key',
      'PracticeUser_practiceId_userId_key',
    ];

    const foundConstraints: string[] = [];

    for (const index of indexes) {
      console.log(`\n📋 Table: ${index.tablename}`);
      console.log(`   Index:  ${index.indexname}`);
      console.log(`   SQL:    ${index.indexdef}`);
      foundConstraints.push(index.indexname);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ Constraint verification:\n');

    let allFound = true;
    for (const constraint of expectedConstraints) {
      const found = foundConstraints.includes(constraint);
      console.log(`   ${found ? '✅' : '❌'} ${constraint}`);
      if (!found) allFound = false;
    }

    if (allFound) {
      console.log('\n✅ All expected unique constraints are present!');
      process.exit(0);
    } else {
      console.log('\n❌ Some constraints are missing!');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ ERROR verifying constraints:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

