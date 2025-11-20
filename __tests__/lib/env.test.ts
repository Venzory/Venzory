/**
 * Environment Variable Validation Tests
 * 
 * These tests verify that the env validation module correctly:
 * - Validates required variables
 * - Enforces format requirements (PostgreSQL URLs, minimum lengths, HTTPS in production)
 * - Provides helpful error messages
 * - Handles production vs development differences
 * - Applies defaults correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Type for our env module
type EnvModule = {
  env: {
    NODE_ENV: 'development' | 'production' | 'test';
    DATABASE_URL: string;
    NEXTAUTH_SECRET: string;
    CSRF_SECRET: string;
    EMAIL_FROM: string;
    NEXTAUTH_URL: string;
    NEXT_PUBLIC_APP_URL: string;
    RESEND_API_KEY?: string;
    REDIS_URL?: string;
    SENTRY_DSN?: string;
    NEXT_PUBLIC_SENTRY_DSN?: string;
    SENTRY_ORG?: string;
    SENTRY_PROJECT?: string;
    SENTRY_AUTH_TOKEN?: string;
    NEXT_RUNTIME?: 'nodejs' | 'edge';
  };
};

/**
 * Helper to create a valid base environment configuration
 */
function createValidEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
    NEXTAUTH_SECRET: 'a'.repeat(32), // 32 character secret
    CSRF_SECRET: 'b'.repeat(32), // 32 character secret
    EMAIL_FROM: 'test@example.com',
    ...overrides,
  };
}

/**
 * Helper to dynamically import env module with fresh process.env
 */
async function importEnvWithConfig(config: Record<string, string | undefined>) {
  // Save original env
  const originalEnv = process.env;
  
  try {
    // Reset module registry to force re-evaluation
    vi.resetModules();
    
    // Set new env
    process.env = { ...config } as any;
    
    // Dynamic import to trigger validation
    const envModule = await import('../../lib/env');
    return envModule;
  } finally {
    // Restore original env
    process.env = originalEnv;
  }
}

/**
 * Helper to test that env validation fails with specific error
 */
async function expectEnvToFail(config: Record<string, string | undefined>, expectedError: string | RegExp) {
  await expect(
    importEnvWithConfig(config)
  ).rejects.toThrow(expectedError);
}

describe('Environment Variable Validation', () => {
  beforeEach(() => {
    // Clear console.error to avoid cluttering test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Required Variables (All Environments)', () => {
    it('should pass with all required variables set', async () => {
      const config = createValidEnv();
      const { env } = await importEnvWithConfig(config);
      
      expect(env.NODE_ENV).toBe('development');
      expect(env.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/testdb');
      expect(env.NEXTAUTH_SECRET).toBe('a'.repeat(32));
      expect(env.CSRF_SECRET).toBe('b'.repeat(32));
    });

    it('should fail when DATABASE_URL is missing', async () => {
      const config = createValidEnv({ DATABASE_URL: undefined });
      await expectEnvToFail(config, /DATABASE_URL/);
    });

    it('should fail when NEXTAUTH_SECRET is missing', async () => {
      const config = createValidEnv({ NEXTAUTH_SECRET: undefined });
      await expectEnvToFail(config, /NEXTAUTH_SECRET/);
    });

    it('should fail when CSRF_SECRET is missing', async () => {
      const config = createValidEnv({ CSRF_SECRET: undefined });
      await expectEnvToFail(config, /CSRF_SECRET/);
    });
  });

  describe('DATABASE_URL Validation', () => {
    it('should accept postgres:// URLs', async () => {
      const config = createValidEnv({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
      });
      const { env } = await importEnvWithConfig(config);
      expect(env.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/db');
    });

    it('should accept postgresql:// URLs', async () => {
      const config = createValidEnv({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      });
      const { env } = await importEnvWithConfig(config);
      expect(env.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
    });

    it('should reject non-PostgreSQL URLs', async () => {
      const config = createValidEnv({
        DATABASE_URL: 'mysql://localhost:3306/db',
      });
      await expectEnvToFail(config, /PostgreSQL connection string/);
    });

    it('should reject invalid URL format', async () => {
      const config = createValidEnv({
        DATABASE_URL: 'not-a-valid-url',
      });
      await expectEnvToFail(config, /Invalid URL/i);
    });
  });

  describe('Secret Length Validation', () => {
    it('should accept 32+ character secrets', async () => {
      const config = createValidEnv({
        NEXTAUTH_SECRET: 'a'.repeat(32),
        CSRF_SECRET: 'b'.repeat(40),
      });
      const { env } = await importEnvWithConfig(config);
      expect(env.NEXTAUTH_SECRET.length).toBeGreaterThanOrEqual(32);
      expect(env.CSRF_SECRET.length).toBeGreaterThanOrEqual(32);
    });

    it('should reject NEXTAUTH_SECRET shorter than 32 characters', async () => {
      const config = createValidEnv({
        NEXTAUTH_SECRET: 'too-short',
      });
      await expectEnvToFail(config, /NEXTAUTH_SECRET must be at least 32/);
    });

    it('should reject CSRF_SECRET shorter than 32 characters', async () => {
      const config = createValidEnv({
        CSRF_SECRET: 'also-too-short',
      });
      await expectEnvToFail(config, /CSRF_SECRET must be at least 32/);
    });
  });

  describe('Development Defaults', () => {
    it('should default NEXTAUTH_URL to localhost in development', async () => {
      const config = createValidEnv({
        NODE_ENV: 'development',
        // Omit NEXTAUTH_URL to test default
      });
      const { env } = await importEnvWithConfig(config);
      expect(env.NEXTAUTH_URL).toBe('http://localhost:3000');
    });

    it('should default NEXT_PUBLIC_APP_URL to localhost in development', async () => {
      const config = createValidEnv({
        NODE_ENV: 'development',
        // Omit NEXT_PUBLIC_APP_URL to test default
      });
      const { env } = await importEnvWithConfig(config);
      expect(env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
    });

    it('should allow overriding defaults in development', async () => {
      const config = createValidEnv({
        NODE_ENV: 'development',
        NEXTAUTH_URL: 'http://localhost:4000',
        NEXT_PUBLIC_APP_URL: 'http://localhost:4000',
      });
      const { env } = await importEnvWithConfig(config);
      expect(env.NEXTAUTH_URL).toBe('http://localhost:4000');
      expect(env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:4000');
    });
  });

  describe('Production Requirements', () => {
    it('should require RESEND_API_KEY in production', async () => {
      const config = createValidEnv({
        NODE_ENV: 'production',
        NEXTAUTH_URL: 'https://example.com',
        NEXT_PUBLIC_APP_URL: 'https://example.com',
        // Omit RESEND_API_KEY
        REDIS_URL: 'redis://localhost:6379',
        CRON_SECRET: 'c'.repeat(32),
      });
      await expectEnvToFail(config, /RESEND_API_KEY/);
    });

    it('should require REDIS_URL in production', async () => {
      const config = createValidEnv({
        NODE_ENV: 'production',
        NEXTAUTH_URL: 'https://example.com',
        NEXT_PUBLIC_APP_URL: 'https://example.com',
        RESEND_API_KEY: 're_test_key',
        // Omit REDIS_URL
        CRON_SECRET: 'c'.repeat(32),
      });
      await expectEnvToFail(config, /REDIS_URL/);
    });

    it('should require HTTPS for NEXTAUTH_URL in production', async () => {
      const config = createValidEnv({
        NODE_ENV: 'production',
        NEXTAUTH_URL: 'http://example.com', // HTTP not allowed
        NEXT_PUBLIC_APP_URL: 'https://example.com',
        RESEND_API_KEY: 're_test_key',
        REDIS_URL: 'redis://localhost:6379',
        CRON_SECRET: 'c'.repeat(32),
      });
      await expectEnvToFail(config, /NEXTAUTH_URL must use HTTPS in production/);
    });

    it('should require HTTPS for NEXT_PUBLIC_APP_URL in production', async () => {
      const config = createValidEnv({
        NODE_ENV: 'production',
        NEXTAUTH_URL: 'https://example.com',
        NEXT_PUBLIC_APP_URL: 'http://example.com', // HTTP not allowed
        RESEND_API_KEY: 're_test_key',
        REDIS_URL: 'redis://localhost:6379',
        CRON_SECRET: 'c'.repeat(32),
      });
      await expectEnvToFail(config, /NEXT_PUBLIC_APP_URL must use HTTPS in production/);
    });

    it('should pass with all production requirements met', async () => {
      const config = createValidEnv({
        NODE_ENV: 'production',
        NEXTAUTH_URL: 'https://example.com',
        NEXT_PUBLIC_APP_URL: 'https://example.com',
        RESEND_API_KEY: 're_test_key',
        REDIS_URL: 'redis://localhost:6379',
        CRON_SECRET: 'c'.repeat(32),
      });
      const { env } = await importEnvWithConfig(config);
      expect(env.NODE_ENV).toBe('production');
      expect(env.NEXTAUTH_URL).toBe('https://example.com');
      expect(env.NEXT_PUBLIC_APP_URL).toBe('https://example.com');
      expect(env.RESEND_API_KEY).toBe('re_test_key');
      expect(env.REDIS_URL).toBe('redis://localhost:6379');
    });
  });

  describe('Optional Variables (Sentry)', () => {
    it('should accept valid Sentry DSNs when provided', async () => {
      const config = createValidEnv({
        SENTRY_DSN: 'https://abc123@sentry.io/456',
        NEXT_PUBLIC_SENTRY_DSN: 'https://def456@sentry.io/789',
      });
      const { env } = await importEnvWithConfig(config);
      expect(env.SENTRY_DSN).toBe('https://abc123@sentry.io/456');
      expect(env.NEXT_PUBLIC_SENTRY_DSN).toBe('https://def456@sentry.io/789');
    });

    it('should allow empty string for optional Sentry vars', async () => {
      const config = createValidEnv({
        SENTRY_DSN: '',
        SENTRY_ORG: '',
        SENTRY_PROJECT: '',
      });
      const { env } = await importEnvWithConfig(config);
      expect(env.SENTRY_DSN).toBe('');
      expect(env.SENTRY_ORG).toBe('');
      expect(env.SENTRY_PROJECT).toBe('');
    });

    it('should allow omitting Sentry variables', async () => {
      const config = createValidEnv({
        // All Sentry vars omitted
      });
      const { env } = await importEnvWithConfig(config);
      expect(env.SENTRY_DSN).toBeUndefined();
      expect(env.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined();
    });

    it('should reject invalid Sentry DSN URLs', async () => {
      const config = createValidEnv({
        SENTRY_DSN: 'not-a-valid-url',
      });
      await expectEnvToFail(config, /Invalid URL/i);
    });
  });

  describe('REDIS_URL Validation', () => {
    it('should accept valid redis:// URLs', async () => {
      const config = createValidEnv({
        REDIS_URL: 'redis://localhost:6379',
      });
      const { env } = await importEnvWithConfig(config);
      expect(env.REDIS_URL).toBe('redis://localhost:6379');
    });

    it('should accept redis:// URLs with auth', async () => {
      const config = createValidEnv({
        REDIS_URL: 'redis://:password@localhost:6379',
      });
      const { env } = await importEnvWithConfig(config);
      expect(env.REDIS_URL).toBe('redis://:password@localhost:6379');
    });

    it('should allow empty string in development', async () => {
      const config = createValidEnv({
        NODE_ENV: 'development',
        REDIS_URL: '',
      });
      const { env } = await importEnvWithConfig(config);
      expect(env.REDIS_URL).toBe('');
    });

    it('should allow omitting REDIS_URL in development', async () => {
      const config = createValidEnv({
        NODE_ENV: 'development',
        // REDIS_URL omitted
      });
      const { env } = await importEnvWithConfig(config);
      expect(env.REDIS_URL).toBeUndefined();
    });
  });

  describe('NODE_ENV Validation', () => {
    it('should accept "development"', async () => {
      const config = createValidEnv({ NODE_ENV: 'development' });
      const { env } = await importEnvWithConfig(config);
      expect(env.NODE_ENV).toBe('development');
    });

    it('should accept "production"', async () => {
      const config = createValidEnv({
        NODE_ENV: 'production',
        NEXTAUTH_URL: 'https://example.com',
        NEXT_PUBLIC_APP_URL: 'https://example.com',
        RESEND_API_KEY: 're_test',
        REDIS_URL: 'redis://localhost:6379',
        CRON_SECRET: 'c'.repeat(32),
      });
      const { env } = await importEnvWithConfig(config);
      expect(env.NODE_ENV).toBe('production');
    });

    it('should accept "test"', async () => {
      const config = createValidEnv({ NODE_ENV: 'test' });
      const { env } = await importEnvWithConfig(config);
      expect(env.NODE_ENV).toBe('test');
    });

    it('should default to "development" if not set', async () => {
      const config = createValidEnv({ NODE_ENV: undefined });
      const { env } = await importEnvWithConfig(config);
      expect(env.NODE_ENV).toBe('development');
    });

    it('should reject invalid NODE_ENV values', async () => {
      const config = createValidEnv({ NODE_ENV: 'staging' as any });
      await expectEnvToFail(config, /Invalid option|Invalid enum value/i);
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error message for missing required var', async () => {
      const config = createValidEnv({ CSRF_SECRET: undefined });
      
      try {
        await importEnvWithConfig(config);
        expect.fail('Should have thrown error');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Environment validation failed');
      }
    });

    it('should provide instructions for generating secrets', async () => {
      const config = createValidEnv({ NEXTAUTH_SECRET: 'short' });
      
      // Check that console.error was called with helpful message
      await expectEnvToFail(config, /NEXTAUTH_SECRET/);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('openssl rand -base64 32')
      );
    });
  });

  describe('Type Safety', () => {
    it('should export properly typed env object', async () => {
      const config = createValidEnv();
      const { env } = await importEnvWithConfig(config);
      
      // TypeScript should infer these as their proper types
      const nodeEnv: 'development' | 'production' | 'test' = env.NODE_ENV;
      const dbUrl: string = env.DATABASE_URL;
      const secret: string = env.NEXTAUTH_SECRET;
      
      expect(nodeEnv).toBeDefined();
      expect(dbUrl).toBeDefined();
      expect(secret).toBeDefined();
    });
  });
});

