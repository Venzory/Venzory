/**
 * Pre-deployment Migration Check Script
 * 
 * This script validates that all migrations are properly applied before deployment.
 * It can be run as part of the build process or CI/CD pipeline.
 * 
 * Usage:
 *   npx tsx scripts/check-migrations.ts
 * 
 * Or add to package.json:
 *   "db:check-migrations": "tsx scripts/check-migrations.ts"
 * 
 * Exit codes:
 *   0 - All migrations are applied
 *   1 - Pending migrations detected or error occurred
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface MigrationRecord {
  migration_name: string;
  checksum: string;
  finished_at: Date;
  rolled_back_at: Date | null;
}

async function main() {
  console.log('🔍 Checking migration status...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Get applied migrations from database
    const appliedMigrations = await prisma.$queryRaw<MigrationRecord[]>`
      SELECT migration_name, checksum, finished_at, rolled_back_at 
      FROM "_prisma_migrations" 
      WHERE rolled_back_at IS NULL
      ORDER BY finished_at
    `;
    
    // Get migrations from filesystem
    const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
    const migrationFolders = fs.readdirSync(migrationsDir)
      .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory())
      .filter(f => f !== 'migration_lock.toml' && !f.startsWith('.'))
      .sort();
    
    const appliedNames = new Set(appliedMigrations.map(m => m.migration_name));
    const pendingMigrations: string[] = [];
    const checksumMismatches: string[] = [];
    
    // Check for pending migrations and checksum mismatches
    for (const folder of migrationFolders) {
      if (!appliedNames.has(folder)) {
        pendingMigrations.push(folder);
        continue;
      }
      
      // Verify checksum
      const sqlPath = path.join(migrationsDir, folder, 'migration.sql');
      if (fs.existsSync(sqlPath)) {
        const content = fs.readFileSync(sqlPath, 'utf-8');
        const expectedChecksum = crypto.createHash('sha256').update(content).digest('hex');
        const appliedMigration = appliedMigrations.find(m => m.migration_name === folder);
        
        // Skip empty checksum (manually resolved migrations) and custom checksums
        const actualChecksum = appliedMigration?.checksum || '';
        if (actualChecksum && 
            actualChecksum !== expectedChecksum && 
            actualChecksum !== 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' && // empty file checksum
            !actualChecksum.includes('_migration')) { // custom checksum marker
          checksumMismatches.push(`${folder}: expected ${expectedChecksum.slice(0, 16)}..., got ${actualChecksum.slice(0, 16)}...`);
        }
      }
    }
    
    // Report results
    console.log(`📦 Found ${migrationFolders.length} migrations in filesystem`);
    console.log(`✅ Found ${appliedMigrations.length} applied migrations in database\n`);
    
    if (pendingMigrations.length > 0) {
      console.log('❌ PENDING MIGRATIONS DETECTED:\n');
      pendingMigrations.forEach(m => console.log(`   - ${m}`));
      console.log('\n⚠️  Run "npx prisma migrate deploy" to apply pending migrations.\n');
      process.exit(1);
    }
    
    if (checksumMismatches.length > 0) {
      console.log('⚠️  CHECKSUM WARNINGS (may indicate manual modifications):\n');
      checksumMismatches.forEach(m => console.log(`   - ${m}`));
      console.log('');
    }
    
    console.log('✅ All migrations are applied. Database schema is up to date.\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error checking migrations:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

