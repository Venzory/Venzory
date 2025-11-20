/**
 * Mock Prisma client for unit tests
 * Provides a lightweight mock of Prisma client to avoid database dependencies
 */

import { vi } from 'vitest';

/**
 * Creates a mock Prisma client with common methods stubbed
 * Each method returns a vi.fn() mock that can be configured per-test
 */
export function createMockPrismaClient() {
  return {
    $transaction: vi.fn((callback) => {
      // For simple transactions, just execute the callback with the mock client
      return callback(createMockPrismaClient());
    }),
    
    practice: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
    
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    
    location: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
    
    item: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
    
    product: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    
    locationInventory: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
    
    stockCountSession: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    
    stockCountLine: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },

    // Added missing supplier mocks
    practiceSupplier: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },

    globalSupplier: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
    
    supplier: { // Legacy/Alias if needed, but better to remove usage
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
    
    stockAdjustment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    
    inventoryTransfer: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    
    auditLog: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };
}

/**
 * Type for the mock Prisma client
 */
export type MockPrismaClient = ReturnType<typeof createMockPrismaClient>;

/**
 * Helper to reset all mocks on a Prisma client
 */
export function resetMockPrismaClient(mockClient: MockPrismaClient) {
  vi.clearAllMocks();
}

/**
 * Creates a mock transaction client that mimics Prisma transaction behavior
 */
export function createMockTransactionClient() {
  const client = createMockPrismaClient();
  
  // Configure $transaction to execute callback immediately
  client.$transaction.mockImplementation((callback) => {
    return callback(client);
  });
  
  return client;
}

