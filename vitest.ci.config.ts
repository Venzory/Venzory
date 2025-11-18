import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Only include stable, critical tests for CI
    include: [
      '__tests__/lib/csrf.test.ts',
      '__tests__/lib/csp.test.ts',
      '__tests__/middleware-csrf.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/tests/**'],
    pool: 'threads',
    testTimeout: 10000,
    hookTimeout: 5000,
    isolate: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

