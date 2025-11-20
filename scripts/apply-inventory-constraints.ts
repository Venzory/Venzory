import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const migrationFilePath = path.join(
    process.cwd(),
    'prisma/migrations/20251120100000_add_inventory_invariants/migration.sql'
  );

  console.log(`Reading migration file from: ${migrationFilePath}`);
  const sql = fs.readFileSync(migrationFilePath, 'utf-8');

  // Split by semicolon to execute statements individually (Prisma might not handle multiple statements in one go depending on the driver, but usually it does. Safe to try all at once first, if fails, split)
  // Actually, executeRawUnsafe can handle multiple statements if the driver allows. Postgres usually allows.
  
  console.log('Executing SQL...');
  
  // Split by semicolon and filter out empty lines
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  try {
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await prisma.$executeRawUnsafe(statement);
    }
    console.log('Successfully applied inventory constraints.');
  } catch (error) {
    console.error('Error applying constraints:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

