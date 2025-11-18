/**
 * Application Error Normalization
 * 
 * Provides utilities for normalizing unknown errors into a consistent shape
 * for server actions and services, preserving error codes from Prisma, Zod, etc.
 */

import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { isDomainError } from '@/src/domain/errors';

/**
 * Normalized application error shape
 */
export type AppError = {
  message: string;
  code?: string;
};

/**
 * Normalize any error into a consistent AppError shape
 * 
 * Preserves error codes from:
 * - DomainError (code property)
 * - Prisma errors (P2002, P2025, etc.)
 * - ZodError (mapped to VALIDATION_ERROR)
 * - Generic Error (mapped to INTERNAL_ERROR)
 * 
 * @param error - The error to normalize (unknown type from catch blocks)
 * @returns Normalized error with message and optional code
 * 
 * @example
 * ```typescript
 * try {
 *   await repository.create(data);
 * } catch (error: unknown) {
 *   const appError = toAppError(error);
 *   if (appError.code === 'P2002') {
 *     return { error: 'Already exists' };
 *   }
 *   return { error: appError.message };
 * }
 * ```
 */
export function toAppError(error: unknown): AppError {
  // Domain errors (business logic violations)
  if (isDomainError(error)) {
    return {
      message: error.message,
      code: error.code,
    };
  }

  // Prisma known request errors (P2002, P2025, etc.)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      message: error.message,
      code: error.code, // Preserves P2002, P2025, etc.
    };
  }

  // Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      message: error.message,
      code: 'PRISMA_VALIDATION_ERROR',
    };
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return {
      message: error.message,
      code: 'VALIDATION_ERROR',
    };
  }

  // Generic Error instances
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'INTERNAL_ERROR',
    };
  }

  // Non-Error values (strings, objects, etc.)
  return {
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
  };
}

