import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const migrationName = '20251119120000_init';
  const filePath = path.join(process.cwd(), 'prisma/migrations', migrationName, 'migration.sql');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Prisma uses SHA256
  const checksum = crypto.createHash('sha256').update(content).digest('hex');

  console.log(`Inserting migration ${migrationName} with checksum ${checksum}...`);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "_prisma_migrations" (
      "id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count"
    ) VALUES (
      '${crypto.randomUUID()}', '${checksum}', NOW(), '${migrationName}', NULL, NULL, NOW(), 1
    );
  `);

  console.log('Done.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

