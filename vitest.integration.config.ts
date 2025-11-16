import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.integration.setup.ts'],
    include: ['tests/integration/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**'],
    // Integration tests may take longer due to real database operations
    testTimeout: 30000, // 30s for integration tests
    hookTimeout: 10000, // 10s for setup/teardown hooks
    // Isolate tests for better reliability
    isolate: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

