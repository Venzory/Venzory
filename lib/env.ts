/**
 * Environment Variable Validation
 * 
 * This module provides strict, fail-fast validation of all environment variables
 * using Zod schemas. The validation runs immediately on module import to catch
 * configuration errors at startup.
 * 
 * Key Features:
 * - Type-safe environment variable access throughout the application
 * - Production vs development conditional validation
 * - Clear, actionable error messages on validation failure
 * - Automatic defaults for development environment
 * - HTTPS enforcement for production URLs
 * - Minimum length requirements for secrets (32 characters)
 */

import { z } from 'zod';
import logger from '@/lib/logger';

/**
 * Helper to create a minimum length secret validator
 */
const secretSchema = (name: string, minLength = 32) =>
  z
    .string()
    .min(minLength, {
      message: `${name} must be at least ${minLength} characters for security. Generate with: openssl rand -base64 32`,
    });

/**
 * Helper to validate PostgreSQL connection strings
 */
const postgresUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => url.startsWith('postgres://') || url.startsWith('postgresql://'),
    {
      message: 'DATABASE_URL must be a valid PostgreSQL connection string (postgres:// or postgresql://)',
    }
  );

/**
 * Core environment schema - variables that are always required
 */
const coreSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_URL: postgresUrlSchema,
  NEXTAUTH_SECRET: secretSchema('NEXTAUTH_SECRET'),
  CSRF_SECRET: secretSchema('CSRF_SECRET'),
  EMAIL_FROM: z.string().email().default('noreply@venzory.com'),
  PLATFORM_OWNER_EMAIL: z.string().email().optional().or(z.literal('')),
  // Comma-separated list of data steward emails for Admin Console access
  // These users have Admin Console access but NOT Owner Portal access
  PLATFORM_DATA_STEWARD_EMAILS: z.string().optional().or(z.literal('')),
});

/**
 * Public/edge-safe environment values
 */
const publicSchema = z.object({
  NEXT_PUBLIC_PLATFORM_OWNER_EMAIL: z.string().email().optional().or(z.literal('')),
});

/**
 * Production-specific validation schema
 */
const productionSchema = z.object({
  RESEND_API_KEY: z.string().min(1, {
    message: 'RESEND_API_KEY is required in production for email functionality',
  }),
  REDIS_URL: z.string().url().refine((url) => url.startsWith('redis://') || url.startsWith('rediss://'), {
    message: 'REDIS_URL must be a valid Redis connection string (redis:// or rediss://)',
  }),
  NEXTAUTH_URL: z
    .string()
    .url()
    .refine((url) => url.startsWith('https://') || url.startsWith('http://localhost'), {
      message: 'NEXTAUTH_URL must use HTTPS in production (or http://localhost for local builds)',
    }),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .refine((url) => url.startsWith('https://') || url.startsWith('http://localhost'), {
      message: 'NEXT_PUBLIC_APP_URL must use HTTPS in production (or http://localhost for local builds)',
    }),
  CRON_SECRET: secretSchema('CRON_SECRET'),
});

/**
 * Development-specific validation schema (optional fields with defaults)
 */
const developmentSchema = z.object({
  RESEND_API_KEY: z.string().optional(),
  REDIS_URL: z.string().url().optional().or(z.literal('')),
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  CRON_SECRET: z.string().optional(),
  // Email sandbox: When set in non-production, ALL emails are redirected to this address
  // This prevents accidental sends to real users during development/staging
  DEV_EMAIL_RECIPIENT: z.string().email().optional().or(z.literal('')),
});

/**
 * Optional Sentry configuration (all environments)
 */
const sentrySchema = z.object({
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  SENTRY_ORG: z.string().optional().or(z.literal('')),
  SENTRY_PROJECT: z.string().optional().or(z.literal('')),
  SENTRY_AUTH_TOKEN: z.string().optional().or(z.literal('')),
});

/**
 * Runtime-specific variables (used by Next.js and Sentry)
 */
const runtimeSchema = z.object({
  NEXT_RUNTIME: z.enum(['nodejs', 'edge']).optional(),
});

/**
 * Complete environment schema with conditional validation
 */
const envSchema = z
  .object({
    ...coreSchema.shape,
    ...developmentSchema.shape,
    ...sentrySchema.shape,
    ...runtimeSchema.shape,
    ...publicSchema.shape,
  })
  .superRefine((data, ctx) => {
    const isProduction = data.NODE_ENV === 'production';

    if (isProduction) {
      // Validate production-specific requirements
      const productionResult = productionSchema.safeParse(data);
      
      if (!productionResult.success) {
        productionResult.error.issues.forEach((issue) => {
          ctx.addIssue(issue as any); // Type cast needed for Zod v4 compatibility
        });
      }
    }
  });

/**
 * Parse and validate environment variables
 */
function parseEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // Log validation errors with structured logging
    logger.error({
      module: 'env',
      operation: 'parseEnv',
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    }, 'Invalid environment variables - see errors for details');
    
    const errorMessages = parsed.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return `${path}: ${issue.message}`;
    }).join(', ');

    throw new Error(`Environment validation failed: ${errorMessages}`);
  }

  return parsed.data;
}

/**
 * Validated environment variables
 * 
 * Import this object instead of using process.env directly:
 * 
 * ```typescript
 * import { env } from '@/lib/env';
 * 
 * const dbUrl = env.DATABASE_URL;
 * const isProduction = env.NODE_ENV === 'production';
 * ```
 */
export const env = parseEnv();

/**
 * Type of the validated environment object
 */
export type Env = typeof env;
