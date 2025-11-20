import dotenv from 'dotenv';
import { vi } from 'vitest';

// Mock next/server to fix import issues in dependencies (like next-auth)
vi.mock('next/server', () => {
  return {
    NextRequest: class {},
    NextResponse: {
      json: (body: any, init?: any) => ({ 
        body,
        headers: new Headers(init?.headers),
      }),
      next: () => ({
        headers: new Headers(),
      }),
      redirect: () => ({
        headers: new Headers(),
      }),
    },
  };
});

// Load environment variables from .env file
dotenv.config();

/**
 * Integration Test Setup
 * 
 * This setup file provides minimal environment configuration for integration tests.
 * Unlike unit tests, integration tests use the REAL Prisma client and database.
 * 
 * Key differences from vitest.setup.ts:
 * - Does NOT mock @/lib/prisma
 * - Does NOT mock Next.js modules (next/server, next-auth, etc.)
 * - Uses real database connection via DATABASE_URL
 * - Provides sensible defaults for required secrets
 */

/**
 * Ensure NODE_ENV is set to 'test'
 * Note: We check but don't set if already defined (NODE_ENV is read-only in some contexts)
 */
if (process.env.NODE_ENV !== 'test') {
  console.warn(`⚠️  NODE_ENV is '${process.env.NODE_ENV}', expected 'test' for integration tests`);
}

/**
 * Validate DATABASE_URL is set and points to PostgreSQL
 * Integration tests require a real database connection
 */
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  console.error('');
  console.error('Integration tests require a PostgreSQL test database.');
  console.error('');
  console.error('Setup instructions:');
  console.error('  1. Start Postgres: docker compose up -d postgres');
  console.error('  2. Create test DB: docker exec -it venzory-postgres createdb -U venzory venzory_test');
  console.error('  3. Set DATABASE_URL: export DATABASE_URL="postgresql://venzory:venzory@localhost:5432/venzory_test"');
  console.error('  4. Run migrations: npm run db:migrate:deploy');
  console.error('  5. Run tests: npm run test:integration');
  console.error('');
  throw new Error('DATABASE_URL is required for integration tests');
}

// Validate it's a PostgreSQL URL
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://')) {
  console.error('❌ DATABASE_URL must be a PostgreSQL connection string');
  console.error(`   Got: ${dbUrl.substring(0, 20)}...`);
  console.error('');
  console.error('Expected format: postgresql://user:password@host:port/database');
  console.error('');
  throw new Error('Invalid DATABASE_URL for integration tests');
}

/**
 * Provide sensible defaults for required secrets
 * These are only used if not already set in the environment
 */
if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = 'integration-test-secret-min-32-chars-long-for-nextauth';
}

if (!process.env.CSRF_SECRET) {
  process.env.CSRF_SECRET = 'integration-test-csrf-secret-32-chars-long-minimum';
}

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
}

/**
 * Log integration test environment info
 */
console.log('🔧 Integration test environment:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   DATABASE_URL: ${dbUrl.split('@')[1] || 'localhost:5432/venzory_test'}`);
console.log('');

