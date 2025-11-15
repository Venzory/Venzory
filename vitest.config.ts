import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/tests/**'],
    pool: 'threads',
    // Prevent tests from hanging indefinitely
    testTimeout: 10000, // 10s default timeout for unit tests
    hookTimeout: 5000,  // 5s for setup/teardown hooks
    // Isolate tests for better reliability
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'vitest.config.ts',
        'vitest.setup.ts',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/dist/**',
        '__tests__/**',
        'tests/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

