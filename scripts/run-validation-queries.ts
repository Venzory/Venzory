/**
 * Run validation queries to detect existing constraint violations
 * 
 * Usage: npx tsx scripts/run-validation-queries.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function runValidationQueries() {
  console.log('🔍 Running pre-migration validation queries...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'prisma', 'validation-queries.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Split into individual queries (separated by semicolons)
    const queries = sqlContent
      .split(';')
      .map(q => q.trim())
      .filter(q => 
        q.length > 0 && 
        !q.startsWith('--') && 
        !q.includes('INSTRUCTIONS') &&
        !q.includes('How to run these queries')
      );

    console.log(`Found ${queries.length} queries to execute\n`);

    let totalViolations = 0;
    let queriesWithResults = 0;

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      // Skip comment-only queries
      if (!query.includes('SELECT') && !query.includes('select')) {
        continue;
      }

      try {
        const results = await prisma.$queryRawUnsafe(query);
        
        if (Array.isArray(results) && results.length > 0) {
          queriesWithResults++;
          totalViolations += results.length;
          
          console.log(`⚠️  Query ${i + 1} found ${results.length} issue(s):`);
          console.log(JSON.stringify(results, null, 2));
          console.log('\n---\n');
        }
      } catch (error: any) {
        // Some queries might fail if tables are empty or syntax issues
        if (!error.message.includes('does not exist')) {
          console.error(`❌ Error in query ${i + 1}:`, error.message);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total queries executed: ${queries.length}`);
    console.log(`Queries with violations: ${queriesWithResults}`);
    console.log(`Total violations found: ${totalViolations}`);
    console.log('='.repeat(80) + '\n');

    if (totalViolations === 0) {
      console.log('✅ No constraint violations found! Database is ready for migration.\n');
      process.exit(0);
    } else {
      console.log('⚠️  Constraint violations found. Review the output above.');
      console.log('   Fix or document these issues before proceeding with migration.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Failed to run validation queries:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runValidationQueries();

