import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextResponse } from 'next/server';
import { withErrorHandler, withErrorHandlerContext } from '@/lib/error-handler';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  RateLimitError,
} from '@/src/domain/errors';

describe('Error Handler', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('withErrorHandler', () => {
    describe('Happy path', () => {
      it('should return response from handler with X-Request-Id header', async () => {
        const handler = vi.fn(() =>
          NextResponse.json({ data: 'success' }, { status: 200 })
        );
        const wrappedHandler = withErrorHandler(handler);

        const request = new Request('http://localhost/api/test', {
          method: 'GET',
        });

        const response = await wrappedHandler(request);
        const data = await response.json();

        expect(handler).toHaveBeenCalled();
        expect(response.status).toBe(200);
        expect(data).toEqual({ data: 'success' });
        expect(response.headers.has('X-Request-Id')).toBe(true);
      });

      it('should use X-Request-ID from request header if provided', async () => {
        const correlationId = 'test-correlation-id-123';
        const handler = vi.fn(() =>
          NextResponse.json({ data: 'success' })
        );
        const wrappedHandler = withErrorHandler(handler);

        const request = new Request('http://localhost/api/test', {
          method: 'GET',
          headers: {
            'X-Request-ID': correlationId,
          },
        });

        const response = await wrappedHandler(request);

        expect(response.headers.get('X-Request-Id')).toBe(correlationId);
      });

      it('should handle lowercase x-request-id header', async () => {
        const correlationId = 'test-lowercase-id';
        const handler = vi.fn(() =>
          NextResponse.json({ data: 'success' })
        );
        const wrappedHandler = withErrorHandler(handler);

        const request = new Request('http://localhost/api/test', {
          method: 'GET',
          headers: {
            'x-request-id': correlationId,
          },
        });

        const response = await wrappedHandler(request);

        expect(response.headers.get('X-Request-Id')).toBe(correlationId);
      });
    });

    describe('DomainError mapping', () => {
      it('should map NotFoundError to 404 with proper format', async () => {
        const handler = vi.fn(() => {
          throw new NotFoundError('User', '123');
        });
        const wrappedHandler = withErrorHandler(handler);

        const request = new Request('http://localhost/api/test');
        const response = await wrappedHandler(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data).toEqual({
          error: {
            code: 'NOT_FOUND',
            message: "User with ID '123' not found",
          },
        });
        expect(response.headers.has('X-Request-Id')).toBe(true);
      });

      it('should map ValidationError to 422 with details', async () => {
        const validationDetails = {
          email: ['Invalid email format'],
          password: ['Password too short'],
        };
        const handler = vi.fn(() => {
          throw new ValidationError('Invalid input', validationDetails);
        });
        const wrappedHandler = withErrorHandler(handler);

        const request = new Request('http://localhost/api/test');
        const response = await wrappedHandler(request);
        const data = await response.json();

        expect(response.status).toBe(422);
        expect(data).toEqual({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: validationDetails,
          },
        });
      });

      it('should map ConflictError to 409', async () => {
        const handler = vi.fn(() => {
          throw new ConflictError('User already exists');
        });
        const wrappedHandler = withErrorHandler(handler);

        const request = new Request('http://localhost/api/test');
        const response = await wrappedHandler(request);
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data).toEqual({
          error: {
            code: 'CONFLICT',
            message: 'User already exists',
          },
        });
      });

      it('should map ForbiddenError to 403', async () => {
        const handler = vi.fn(() => {
          throw new ForbiddenError('Insufficient permissions');
        });
        const wrappedHandler = withErrorHandler(handler);

        const request = new Request('http://localhost/api/test');
        const response = await wrappedHandler(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data).toEqual({
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          },
        });
      });

      it('should map UnauthorizedError to 401', async () => {
        const handler = vi.fn(() => {
          throw new UnauthorizedError('Please sign in');
        });
        const wrappedHandler = withErrorHandler(handler);

        const request = new Request('http://localhost/api/test');
        const response = await wrappedHandler(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toEqual({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Please sign in',
          },
        });
      });

      it('should map RateLimitError to 429 with rate limit headers', async () => {
        const handler = vi.fn(() => {
          throw new RateLimitError('Too many requests', {
            limit: 10,
            remaining: 0,
            reset: 1234567890,
          });
        });
        const wrappedHandler = withErrorHandler(handler);

        const request = new Request('http://localhost/api/test');
        const response = await wrappedHandler(request);
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data).toEqual({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            details: {
              limit: 10,
              remaining: 0,
              reset: 1234567890,
            },
          },
        });
        expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
        expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
        expect(response.headers.get('X-RateLimit-Reset')).toBe('1234567890');
      });
    });

    describe('Unexpected errors', () => {
      it('should return generic 500 error for unexpected Error', async () => {
        const handler = vi.fn(() => {
          throw new Error('Something went wrong');
        });
        const wrappedHandler = withErrorHandler(handler);

        const request = new Request('http://localhost/api/test');
        const response = await wrappedHandler(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
        });
        expect(response.headers.has('X-Request-Id')).toBe(true);
      });

      it('should return generic 500 error for non-Error throws', async () => {
        const handler = vi.fn(() => {
          throw 'string error';
        });
        const wrappedHandler = withErrorHandler(handler);

        const request = new Request('http://localhost/api/test');
        const response = await wrappedHandler(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
        });
      });

      it('should not leak internal error details in response', async () => {
        const handler = vi.fn(() => {
          const error = new Error('Internal database error');
          throw error;
        });
        const wrappedHandler = withErrorHandler(handler);

        const request = new Request('http://localhost/api/test');
        const response = await wrappedHandler(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
        });
        // Verify no internal error details in response
        expect(JSON.stringify(data)).not.toContain('Internal database error');
        // Response should only contain the generic message
        expect(data.error.message).toBe('An unexpected error occurred');
      });
    });

    describe('ValidationError without details', () => {
      it('should handle ValidationError without details field', async () => {
        const handler = vi.fn(() => {
          throw new ValidationError('Invalid request');
        });
        const wrappedHandler = withErrorHandler(handler);

        const request = new Request('http://localhost/api/test');
        const response = await wrappedHandler(request);
        const data = await response.json();

        expect(response.status).toBe(422);
        expect(data).toEqual({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request',
          },
        });
        // Should not have details field if not provided
        expect(data.error).not.toHaveProperty('details');
      });
    });
  });

  describe('withErrorHandlerContext', () => {
    it('should work with dynamic route handlers', async () => {
      const handler = vi.fn(async (request: Request, { params }) => {
        const { id } = await params;
        return NextResponse.json({ id });
      });
      const wrappedHandler = withErrorHandlerContext(handler);

      const request = new Request('http://localhost/api/test/123');
      const params = Promise.resolve({ id: '123' });
      const response = await wrappedHandler(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ id: '123' });
      expect(response.headers.has('X-Request-Id')).toBe(true);
    });

    it('should handle errors in dynamic routes', async () => {
      const handler = vi.fn(async (request: Request, { params }) => {
        const { id } = await params;
        throw new NotFoundError('Item', id);
      });
      const wrappedHandler = withErrorHandlerContext(handler);

      const request = new Request('http://localhost/api/test/456');
      const params = Promise.resolve({ id: '456' });
      const response = await wrappedHandler(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: "Item with ID '456' not found",
        },
      });
    });
  });

  describe('Correlation ID generation', () => {
    it('should generate UUID when no header provided', async () => {
      const handler = vi.fn(() => NextResponse.json({ data: 'test' }));
      const wrappedHandler = withErrorHandler(handler);

      const request = new Request('http://localhost/api/test');
      const response = await wrappedHandler(request);

      const correlationId = response.headers.get('X-Request-Id');
      expect(correlationId).toBeTruthy();
      // UUID v4 pattern
      expect(correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('Response format consistency', () => {
    it('should always use { error: { code, message } } format for domain errors', async () => {
      const domainErrors = [
        new NotFoundError('Resource', '1'),
        new ValidationError('Bad input'),
        new ConflictError('Duplicate'),
        new ForbiddenError('No access'),
        new UnauthorizedError('Not authenticated'),
        new RateLimitError('Too many'),
      ];

      for (const error of domainErrors) {
        const handler = vi.fn(() => {
          throw error;
        });
        const wrappedHandler = withErrorHandler(handler);

        const request = new Request('http://localhost/api/test');
        const response = await wrappedHandler(request);
        const data = await response.json();

        // Check structure
        expect(data).toHaveProperty('error');
        expect(data.error).toHaveProperty('code');
        expect(data.error).toHaveProperty('message');
        expect(typeof data.error.code).toBe('string');
        expect(typeof data.error.message).toBe('string');
      }
    });
  });
});

