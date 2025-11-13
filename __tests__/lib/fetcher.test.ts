import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetcher } from '@/lib/fetcher';
import { ClientApiError } from '@/lib/client-error';
import * as fetchWithCsrfModule from '@/lib/fetch-with-csrf';

// Mock fetchWithCsrf
vi.mock('@/lib/fetch-with-csrf', () => ({
  fetchWithCsrf: vi.fn(),
}));

describe('fetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic functionality', () => {
    it('returns parsed JSON on successful response', async () => {
      const mockData = { id: '123', name: 'Test Item' };
      const mockResponse = new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mockResolvedValue(mockResponse);

      const result = await fetcher('/api/items');

      expect(result).toEqual(mockData);
      expect(fetchWithCsrfModule.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/items',
        expect.any(Object)
      );
    });

    it('throws ClientApiError on error response', async () => {
      const mockErrorResponse = new Response(
        JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            message: 'Item not found',
          },
        }),
        {
          status: 404,
          headers: {
            'X-Request-Id': 'req-123',
          },
        }
      );

      vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mockResolvedValue(mockErrorResponse);

      try {
        await fetcher('/api/items/999');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientApiError);
        if (error instanceof ClientApiError) {
          expect(error.code).toBe('NOT_FOUND');
          expect(error.message).toBe('Item not found');
          expect(error.statusCode).toBe(404);
          expect(error.requestId).toBe('req-123');
        }
      }
    });

    it('includes requestId from X-Request-Id header in error', async () => {
      const mockErrorResponse = new Response(
        JSON.stringify({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
          },
        }),
        {
          status: 403,
          headers: {
            'X-Request-Id': 'correlation-id-456',
          },
        }
      );

      vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mockResolvedValue(mockErrorResponse);

      try {
        await fetcher('/api/admin');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientApiError);
        if (error instanceof ClientApiError) {
          expect(error.requestId).toBe('correlation-id-456');
        }
      }
    });
  });

  describe('JSON body handling', () => {
    it('automatically stringifies object body', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      });

      vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mockResolvedValue(mockResponse);

      const body = { name: 'New Item', quantity: 10 };
      await fetcher('/api/items', {
        method: 'POST',
        body,
      });

      expect(fetchWithCsrfModule.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
          headers: expect.any(Headers),
        })
      );

      // Check headers
      const callArgs = vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mock.calls[0][1];
      const headers = new Headers(callArgs?.headers);
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('preserves string body without modification', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      });

      vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mockResolvedValue(mockResponse);

      const body = 'raw string body';
      await fetcher('/api/items', {
        method: 'POST',
        body,
      });

      expect(fetchWithCsrfModule.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/items',
        expect.objectContaining({
          method: 'POST',
          body: 'raw string body',
        })
      );
    });

    it('does not override existing Content-Type header', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      });

      vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mockResolvedValue(mockResponse);

      await fetcher('/api/items', {
        method: 'POST',
        body: { data: 'test' },
        headers: { 'Content-Type': 'application/custom' },
      });

      const callArgs = vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mock.calls[0][1];
      const headers = new Headers(callArgs?.headers);
      expect(headers.get('Content-Type')).toBe('application/custom');
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      });
      vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mockResolvedValue(mockResponse);
    });

    it('fetcher.get calls with GET method', async () => {
      await fetcher.get('/api/items');

      expect(fetchWithCsrfModule.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/items',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('fetcher.post calls with POST method', async () => {
      await fetcher.post('/api/items', { body: { name: 'Item' } });

      expect(fetchWithCsrfModule.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/items',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('fetcher.patch calls with PATCH method', async () => {
      await fetcher.patch('/api/items/123', { body: { name: 'Updated' } });

      expect(fetchWithCsrfModule.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/items/123',
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    it('fetcher.put calls with PUT method', async () => {
      await fetcher.put('/api/items/123', { body: { name: 'Replaced' } });

      expect(fetchWithCsrfModule.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/items/123',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('fetcher.delete calls with DELETE method', async () => {
      await fetcher.delete('/api/items/123');

      expect(fetchWithCsrfModule.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/items/123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('CSRF integration', () => {
    it('delegates to fetchWithCsrf for all requests', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
      });

      vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mockResolvedValue(mockResponse);

      await fetcher('/api/items', { method: 'POST', body: { test: 'data' } });

      expect(fetchWithCsrfModule.fetchWithCsrf).toHaveBeenCalledTimes(1);
      expect(fetchWithCsrfModule.fetchWithCsrf).toHaveBeenCalledWith(
        '/api/items',
        expect.any(Object)
      );
    });

    it('preserves all fetch options when calling fetchWithCsrf', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      });

      vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mockResolvedValue(mockResponse);

      const options = {
        method: 'POST',
        body: { data: 'test' },
        headers: { 'X-Custom-Header': 'value' },
        credentials: 'include' as RequestCredentials,
      };

      await fetcher('/api/test', options);

      const callArgs = vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mock.calls[0][1];
      expect(callArgs).toMatchObject({
        method: 'POST',
        credentials: 'include',
      });
      const headers = new Headers(callArgs?.headers);
      expect(headers.get('X-Custom-Header')).toBe('value');
    });
  });

  describe('typed responses', () => {
    it('returns correctly typed data', async () => {
      interface Item {
        id: string;
        name: string;
        quantity: number;
      }

      const mockData: Item = { id: '1', name: 'Test', quantity: 5 };
      const mockResponse = new Response(JSON.stringify(mockData), {
        status: 200,
      });

      vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mockResolvedValue(mockResponse);

      const result = await fetcher.get<Item>('/api/items/1');

      // TypeScript will enforce this at compile time
      expect(result.id).toBe('1');
      expect(result.name).toBe('Test');
      expect(result.quantity).toBe(5);
    });

    it('handles array responses', async () => {
      const mockData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];
      const mockResponse = new Response(JSON.stringify(mockData), {
        status: 200,
      });

      vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mockResolvedValue(mockResponse);

      const result = await fetcher.get<Array<{ id: string; name: string }>>(
        '/api/items'
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });
  });

  describe('error scenarios', () => {
    it('handles 400 Bad Request', async () => {
      const mockErrorResponse = new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: { field: 'email' },
          },
        }),
        {
          status: 400,
          headers: { 'X-Request-Id': 'req-400' },
        }
      );

      vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mockResolvedValue(mockErrorResponse);

      try {
        await fetcher.post('/api/items', { body: {} });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientApiError);
        if (error instanceof ClientApiError) {
          expect(error.statusCode).toBe(400);
          expect(error.code).toBe('VALIDATION_ERROR');
          expect(error.details).toEqual({ field: 'email' });
        }
      }
    });

    it('handles 401 Unauthorized', async () => {
      const mockErrorResponse = new Response(
        JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Please sign in',
          },
        }),
        {
          status: 401,
          headers: { 'X-Request-Id': 'req-401' },
        }
      );

      vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mockResolvedValue(mockErrorResponse);

      await expect(fetcher.get('/api/protected')).rejects.toThrow(ClientApiError);
    });

    it('handles 429 Rate Limit', async () => {
      const mockErrorResponse = new Response(
        JSON.stringify({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
          },
        }),
        {
          status: 429,
          headers: { 'X-Request-Id': 'req-429' },
        }
      );

      vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mockResolvedValue(mockErrorResponse);

      try {
        await fetcher.get('/api/items');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientApiError);
        if (error instanceof ClientApiError) {
          expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
          expect(error.statusCode).toBe(429);
        }
      }
    });

    it('handles 500 Internal Server Error', async () => {
      const mockErrorResponse = new Response(
        JSON.stringify({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
        }),
        {
          status: 500,
          headers: { 'X-Request-Id': 'req-500' },
        }
      );

      vi.mocked(fetchWithCsrfModule.fetchWithCsrf).mockResolvedValue(mockErrorResponse);

      try {
        await fetcher.get('/api/items');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientApiError);
        if (error instanceof ClientApiError) {
          expect(error.code).toBe('INTERNAL_ERROR');
          expect(error.statusCode).toBe(500);
        }
      }
    });
  });
});

