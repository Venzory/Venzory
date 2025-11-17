/**
 * Transaction wrapper
 * Provides a clean interface for Prisma transactions
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Transaction client type from Prisma
 */
export type TransactionClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0];

/**
 * Execute a function within a database transaction
 * If the function throws, the transaction is rolled back
 * 
 * @example
 * const result = await withTransaction(async (tx) => {
 *   await tx.item.create({ data: {...} });
 *   await tx.locationInventory.update({ where: {...}, data: {...} });
 *   return { success: true };
 * });
 */
export async function withTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn);
}

/**
 * Execute multiple operations in a transaction
 * Returns an array of results in the same order
 * 
 * @example
 * const [item, inventory] = await transactionAll([
 *   prisma.item.create({ data: {...} }),
 *   prisma.locationInventory.upsert({ where: {...}, create: {...}, update: {...} })
 * ]);
 */
export async function transactionAll<T extends readonly any[]>(
  operations: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  // Use the array overload of $transaction
  return prisma.$transaction(operations as any) as Promise<{
    [K in keyof T]: Awaited<T[K]>;
  }>;
}

/**
 * Check if we're currently in a transaction
 * Useful for conditional logic in repositories
 */
export function isInTransaction(
  client: PrismaClient | TransactionClient
): client is TransactionClient {
  // Prisma transaction clients have a different prototype than the main client
  return client !== prisma;
}

/**
 * Get the appropriate Prisma client (transaction or main)
 * Allows repositories to work both inside and outside transactions
 */
export function getPrismaClient(tx?: TransactionClient): PrismaClient | TransactionClient {
  return tx ?? prisma;
}

