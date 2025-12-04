import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating _prisma_migrations table...');
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id"                    VARCHAR(36) PRIMARY KEY NOT NULL,
        "checksum"              VARCHAR(64) NOT NULL,
        "finished_at"           TIMestamptz,
        "migration_name"        VARCHAR(255) NOT NULL,
        "logs"                  TEXT,
        "rolled_back_at"        TIMestamptz,
        "started_at"            TIMestamptz NOT NULL DEFAULT now(),
        "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
      );
    `);
    console.log('Created _prisma_migrations table.');
  } catch (e) {
    console.error('Error creating table:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

