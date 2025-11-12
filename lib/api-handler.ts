/**
 * API Handler Wrapper with CSRF Protection and Error Handling
 * 
 * Provides HOF wrappers for API route handlers:
 * - Enforces CSRF verification on mutating HTTP methods
 * - Handles errors consistently with correlation IDs
 * - Logs structured errors
 * 
 * Recommended: Use `apiHandler` and `apiHandlerContext` for new routes.
 * These compose CSRF protection with error handling.
 */

import { NextResponse } from 'next/server';
import { verifyCsrf } from '@/lib/csrf';
import { 
  withErrorHandler, 
  withErrorHandlerContext,
  type ApiRouteHandler as ErrorHandlerApiRouteHandler
} from '@/lib/error-handler';

/**
 * HTTP methods that are considered safe (don't mutate state)
 * These methods skip CSRF verification
 */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Bypass list for machine-to-machine endpoints
 * These endpoints don't require CSRF tokens
 * 
 * Rationale:
 * - /api/auth/[...nextauth]: NextAuth internal callbacks
 * - /api/health: Health check for monitoring systems
 */
const CSRF_BYPASS_PATTERNS = [
  /^\/api\/auth\//,  // All NextAuth routes
  /^\/api\/health$/,  // Health check endpoint
];

/**
 * Check if a path should bypass CSRF protection
 */
function shouldBypassCsrf(pathname: string): boolean {
  return CSRF_BYPASS_PATTERNS.some(pattern => pattern.test(pathname));
}

export interface CsrfProtectionOptions {
  /**
   * Explicitly bypass CSRF verification
   * Use with caution - only for machine-to-machine endpoints
   */
  bypassCsrf?: boolean;
}

/**
 * Wrapper for API route handlers that enforces CSRF protection
 * 
 * Automatically verifies CSRF tokens on POST/PUT/PATCH/DELETE requests
 * Skips verification for GET/HEAD/OPTIONS (safe methods)
 * 
 * @param handler - The API route handler function
 * @param options - Optional configuration
 * @returns Wrapped handler with CSRF protection
 * 
 * @example
 * ```typescript
 * import { withCsrfProtection } from '@/lib/api-handler';
 * 
 * export const POST = withCsrfProtection(async (request: Request) => {
 *   // Your handler code here
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withCsrfProtection<T extends any[]>(
  handler: (request: Request, ...args: T) => Promise<Response> | Response,
  options?: CsrfProtectionOptions
) {
  return async (request: Request, ...args: T): Promise<Response> => {
    const method = request.method;
    
    // Skip CSRF verification for safe methods
    if (SAFE_METHODS.includes(method)) {
      return handler(request, ...args);
    }
    
    // Skip CSRF verification if explicitly bypassed
    if (options?.bypassCsrf) {
      return handler(request, ...args);
    }
    
    // Skip CSRF verification for bypass patterns
    const url = new URL(request.url);
    if (shouldBypassCsrf(url.pathname)) {
      return handler(request, ...args);
    }
    
    // Verify CSRF token for mutating methods
    const isValid = await verifyCsrf(request);
    
    if (!isValid) {
      // Return 403 with generic error message
      // Don't leak information about what went wrong
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }
    
    // CSRF verification passed, execute handler
    return handler(request, ...args);
  };
}

/**
 * Type for Next.js API route handler with context parameter
 * Used for dynamic routes like [id]/route.ts
 * In Next.js 15, params is a Promise
 */
export type ApiRouteHandler<TParams = any> = ErrorHandlerApiRouteHandler<TParams>;

/**
 * Wrapper for API route handlers with context that enforces CSRF protection
 * Same as withCsrfProtection but typed for handlers with context parameter
 * 
 * @example
 * ```typescript
 * export const PATCH = withCsrfProtectionContext(
 *   async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
 *     const { id } = await params;
 *     // Your handler code here
 *     return NextResponse.json({ success: true });
 *   }
 * );
 * ```
 */
export function withCsrfProtectionContext<TParams = any>(
  handler: ApiRouteHandler<TParams>,
  options?: CsrfProtectionOptions
): ApiRouteHandler<TParams> {
  return async (request: Request, context: { params: Promise<TParams> }): Promise<Response> => {
    const method = request.method;
    
    // Skip CSRF verification for safe methods
    if (SAFE_METHODS.includes(method)) {
      return handler(request, context);
    }
    
    // Skip CSRF verification if explicitly bypassed
    if (options?.bypassCsrf) {
      return handler(request, context);
    }
    
    // Skip CSRF verification for bypass patterns
    const url = new URL(request.url);
    if (shouldBypassCsrf(url.pathname)) {
      return handler(request, context);
    }
    
    // Verify CSRF token for mutating methods
    const isValid = await verifyCsrf(request);
    
    if (!isValid) {
      // Return 403 with generic error message
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }
    
    // CSRF verification passed, execute handler
    return handler(request, context);
  };
}

/**
 * Composed API handler wrapper with both CSRF protection and error handling
 * 
 * This is the recommended wrapper for new API routes. It provides:
 * - CSRF token verification for mutating requests
 * - Consistent error responses with correlation IDs
 * - Structured error logging
 * 
 * @param handler - The API route handler function
 * @param options - Optional CSRF configuration
 * @returns Wrapped handler with CSRF protection and error handling
 * 
 * @example
 * ```typescript
 * import { apiHandler } from '@/lib/api-handler';
 * import { NotFoundError } from '@/src/domain/errors';
 * 
 * export const POST = apiHandler(async (request: Request) => {
 *   const body = await request.json();
 *   // Your handler code here - throw DomainErrors as needed
 *   if (!item) throw new NotFoundError('Item', id);
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function apiHandler<T extends any[]>(
  handler: (request: Request, ...args: T) => Promise<Response> | Response,
  options?: CsrfProtectionOptions
) {
  return withErrorHandler(withCsrfProtection(handler, options));
}

/**
 * Composed API handler wrapper with context for dynamic routes
 * 
 * Same as apiHandler but typed for handlers with context parameter.
 * Use this for dynamic routes like [id]/route.ts
 * 
 * @param handler - The API route handler function with context
 * @param options - Optional CSRF configuration
 * @returns Wrapped handler with CSRF protection and error handling
 * 
 * @example
 * ```typescript
 * import { apiHandlerContext } from '@/lib/api-handler';
 * import { NotFoundError } from '@/src/domain/errors';
 * 
 * export const GET = apiHandlerContext(
 *   async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
 *     const { id } = await params;
 *     const item = await findItem(id);
 *     if (!item) throw new NotFoundError('Item', id);
 *     return NextResponse.json(item);
 *   }
 * );
 * ```
 */
export function apiHandlerContext<TParams = any>(
  handler: ApiRouteHandler<TParams>,
  options?: CsrfProtectionOptions
): ApiRouteHandler<TParams> {
  return withErrorHandlerContext(withCsrfProtectionContext(handler, options));
}

