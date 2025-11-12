import '@testing-library/jest-dom';

/**
 * Set up valid test environment variables
 * This ensures the env validation module passes in test environment
 */
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
  NEXTAUTH_SECRET: 'a'.repeat(32), // 32 character secret for tests
  CSRF_SECRET: 'b'.repeat(32), // 32 character secret for tests
  NEXTAUTH_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
});
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

