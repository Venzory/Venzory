import { PrismaClient } from '@prisma/client';
import { env } from '@/lib/env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

export const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ operation, model, args, query }) {
      const start = performance.now();
      const result = await query(args);
      const end = performance.now();
      const duration = end - start;

      if (env.NODE_ENV === 'development' && duration > 0) {
         console.log(`\x1b[36m[Prisma]\x1b[0m ${model}.${operation} took \x1b[33m${duration.toFixed(2)}ms\x1b[0m`);
      }

      return result;
    },
  },
}) as unknown as PrismaClient;

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = basePrisma;
}

export type PrismaTransaction = Parameters<PrismaClient['$transaction']>[0];

