/**
 * Global API Error Handler
 * 
 * Wraps API route handlers with consistent error handling:
 * - Maps DomainErrors to appropriate HTTP responses
 * - Hides internal error details in production
 * - Adds correlation IDs for request tracking
 * - Logs structured errors with context
 */

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { isDomainError, type DomainError } from '@/src/domain/errors';
import { createLoggerWithCorrelationId } from './logger';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Error response structure
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Extract correlation ID from request header or generate new one
 */
function getOrCreateCorrelationId(request: Request): string {
  const headerValue = request.headers.get('X-Request-ID') || request.headers.get('x-request-id');
  return headerValue || randomUUID();
}

/**
 * Map DomainError to HTTP response
 */
function mapDomainErrorToResponse(error: DomainError, correlationId: string): Response {
  const responseBody: ErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
    },
  };

  // Include validation details if present
  if (error.details && Object.keys(error.details).length > 0) {
    responseBody.error.details = error.details;
  }

  const response = NextResponse.json(responseBody, { status: error.statusCode });
  response.headers.set('X-Request-Id', correlationId);
  
  // Add rate limit headers for rate limit errors
  if (error.code === 'RATE_LIMIT_EXCEEDED' && error.details) {
    if (error.details.limit !== undefined) response.headers.set('X-RateLimit-Limit', String(error.details.limit));
    if (error.details.remaining !== undefined) response.headers.set('X-RateLimit-Remaining', String(error.details.remaining));
    if (error.details.reset !== undefined) response.headers.set('X-RateLimit-Reset', String(error.details.reset));
  }
  
  return response;
}

/**
 * Create generic 500 error response for unexpected errors
 */
function createGenericErrorResponse(correlationId: string): Response {
  const responseBody: ErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };

  const response = NextResponse.json(responseBody, { status: 500 });
  response.headers.set('X-Request-Id', correlationId);
  
  return response;
}

/**
 * Add correlation ID header to successful responses
 */
function addCorrelationIdToResponse(response: Response, correlationId: string): Response {
  // Clone response to add header if it's not already set
  if (!response.headers.has('X-Request-Id')) {
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    });
    newResponse.headers.set('X-Request-Id', correlationId);
    return newResponse;
  }
  return response;
}

/**
 * Higher-order function that wraps API route handlers with error handling
 * 
 * Features:
 * - Extracts/generates correlation IDs
 * - Maps DomainErrors to consistent responses
 * - Hides internal errors in production
 * - Logs all errors with structured data
 * - Adds X-Request-Id header to all responses
 * 
 * @param handler - The API route handler function
 * @returns Wrapped handler with error handling
 * 
 * @example
 * ```typescript
 * import { withErrorHandler } from '@/lib/error-handler';
 * import { NotFoundError } from '@/src/domain/errors';
 * 
 * export const GET = withErrorHandler(async (request: Request) => {
 *   const item = await findItem(id);
 *   if (!item) throw new NotFoundError('Item', id);
 *   return NextResponse.json(item);
 * });
 * ```
 */
export function withErrorHandler<T extends any[]>(
  handler: (request: Request, ...args: T) => Promise<Response> | Response
) {
  return async (request: Request, ...args: T): Promise<Response> => {
    const correlationId = getOrCreateCorrelationId(request);
    const logger = createLoggerWithCorrelationId(correlationId);
    
    try {
      const response = await handler(request, ...args);
      return addCorrelationIdToResponse(response, correlationId);
    } catch (error) {
      const url = new URL(request.url);
      
      // Log error with context
      if (isDomainError(error)) {
        // Domain errors are expected business logic violations
        logger.warn({
          msg: 'Domain error in API route',
          method: request.method,
          path: url.pathname,
          errorCode: error.code,
          errorMessage: error.message,
          statusCode: error.statusCode,
          details: error.details,
        });
        
        return mapDomainErrorToResponse(error, correlationId);
      } else {
        // Unexpected errors - log with full details
        logger.error({
          msg: 'Unexpected error in API route',
          method: request.method,
          path: url.pathname,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: isProduction ? undefined : error.stack,
          } : String(error),
        });
        
        return createGenericErrorResponse(correlationId);
      }
    }
  };
}

/**
 * Type for Next.js API route handler with context parameter
 * Used for dynamic routes like [id]/route.ts
 * In Next.js 15, params is a Promise
 */
export type ApiRouteHandler<TParams = any> = (
  request: Request,
  context: { params: Promise<TParams> }
) => Promise<Response> | Response;

/**
 * Wrapper for API route handlers with context that adds error handling
 * Same as withErrorHandler but typed for handlers with context parameter
 * 
 * @example
 * ```typescript
 * import { withErrorHandlerContext } from '@/lib/error-handler';
 * import { NotFoundError } from '@/src/domain/errors';
 * 
 * export const GET = withErrorHandlerContext(
 *   async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
 *     const { id } = await params;
 *     const item = await findItem(id);
 *     if (!item) throw new NotFoundError('Item', id);
 *     return NextResponse.json(item);
 *   }
 * );
 * ```
 */
export function withErrorHandlerContext<TParams = any>(
  handler: ApiRouteHandler<TParams>
): ApiRouteHandler<TParams> {
  return async (request: Request, context: { params: Promise<TParams> }): Promise<Response> => {
    const correlationId = getOrCreateCorrelationId(request);
    const logger = createLoggerWithCorrelationId(correlationId);
    
    try {
      const response = await handler(request, context);
      return addCorrelationIdToResponse(response, correlationId);
    } catch (error) {
      const url = new URL(request.url);
      
      // Log error with context
      if (isDomainError(error)) {
        // Domain errors are expected business logic violations
        logger.warn({
          msg: 'Domain error in API route',
          method: request.method,
          path: url.pathname,
          errorCode: error.code,
          errorMessage: error.message,
          statusCode: error.statusCode,
          details: error.details,
        });
        
        return mapDomainErrorToResponse(error, correlationId);
      } else {
        // Unexpected errors - log with full details
        logger.error({
          msg: 'Unexpected error in API route',
          method: request.method,
          path: url.pathname,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: isProduction ? undefined : error.stack,
          } : String(error),
        });
        
        return createGenericErrorResponse(correlationId);
      }
    }
  };
}

