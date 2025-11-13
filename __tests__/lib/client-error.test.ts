import { describe, it, expect } from 'vitest';
import { ClientApiError, asClientError, toUserMessage } from '@/lib/client-error';

describe('ClientApiError', () => {
  it('creates error with all properties', () => {
    const error = new ClientApiError(
      'Test error',
      'TEST_CODE',
      400,
      'req-123',
      { field: 'value' }
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ClientApiError);
    expect(error.name).toBe('ClientApiError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(400);
    expect(error.requestId).toBe('req-123');
    expect(error.details).toEqual({ field: 'value' });
  });

  it('creates error without optional parameters', () => {
    const error = new ClientApiError('Test error', 'TEST_CODE', 400);

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(400);
    expect(error.requestId).toBeNull();
    expect(error.details).toBeUndefined();
  });
});

describe('asClientError', () => {
  it('parses standard API error response', async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { field: 'email' },
        },
      }),
      {
        status: 422,
        headers: {
          'X-Request-Id': 'abc123def456',
        },
      }
    );

    const error = await asClientError(response);

    expect(error).toBeInstanceOf(ClientApiError);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid input');
    expect(error.statusCode).toBe(422);
    expect(error.requestId).toBe('abc123def456');
    expect(error.details).toEqual({ field: 'email' });
  });

  it('extracts requestId from X-Request-Id header', async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          code: 'NOT_FOUND',
          message: 'Item not found',
        },
      }),
      {
        status: 404,
        headers: {
          'X-Request-Id': '123456789abc',
        },
      }
    );

    const error = await asClientError(response);
    expect(error.requestId).toBe('123456789abc');
  });

  it('handles missing requestId gracefully', async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      }),
      {
        status: 403,
      }
    );

    const error = await asClientError(response);
    expect(error.requestId).toBeNull();
  });

  it('handles non-JSON response body', async () => {
    const response = new Response('Internal Server Error', {
      status: 500,
      statusText: 'Internal Server Error',
      headers: {
        'X-Request-Id': 'error-req-id',
      },
    });

    const error = await asClientError(response);
    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.message).toBe('Internal Server Error');
    expect(error.statusCode).toBe(500);
    expect(error.requestId).toBe('error-req-id');
  });

  it('handles malformed JSON response', async () => {
    const response = new Response('{invalid json', {
      status: 500,
      statusText: 'Internal Server Error',
    });

    const error = await asClientError(response);
    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.statusCode).toBe(500);
  });
});

describe('toUserMessage', () => {
  it('maps UNAUTHORIZED to friendly message', () => {
    const error = new ClientApiError('Unauthorized', 'UNAUTHORIZED', 401, 'req-123');
    const message = toUserMessage(error);
    expect(message).toBe('Please sign in to continue (#req-12)');
  });

  it('maps FORBIDDEN to friendly message', () => {
    const error = new ClientApiError('Forbidden', 'FORBIDDEN', 403, 'req-456');
    const message = toUserMessage(error);
    expect(message).toBe("You don't have permission to perform this action (#req-45)");
  });

  it('uses server message for VALIDATION_ERROR', () => {
    const error = new ClientApiError(
      'Email is required',
      'VALIDATION_ERROR',
      422,
      'req-789'
    );
    const message = toUserMessage(error);
    expect(message).toBe('Email is required (#req-78)');
  });

  it('uses server message for NOT_FOUND', () => {
    const error = new ClientApiError(
      'Order with ID "123" not found',
      'NOT_FOUND',
      404,
      'req-abc'
    );
    const message = toUserMessage(error);
    expect(message).toBe('Order with ID "123" not found (#req-ab)');
  });

  it('uses server message for CONFLICT', () => {
    const error = new ClientApiError(
      'Item already exists',
      'CONFLICT',
      409,
      'req-def'
    );
    const message = toUserMessage(error);
    expect(message).toBe('Item already exists (#req-de)');
  });

  it('maps RATE_LIMIT_EXCEEDED to friendly message', () => {
    const error = new ClientApiError(
      'Too many requests',
      'RATE_LIMIT_EXCEEDED',
      429,
      'req-ghi'
    );
    const message = toUserMessage(error);
    expect(message).toBe('Too many requests. Please try again in a moment (#req-gh)');
  });

  it('maps INTERNAL_ERROR to friendly message', () => {
    const error = new ClientApiError(
      'Internal error',
      'INTERNAL_ERROR',
      500,
      'req-jkl'
    );
    const message = toUserMessage(error);
    expect(message).toBe('Something went wrong. Please try again (#req-jk)');
  });

  it('maps unknown error codes to generic message', () => {
    const error = new ClientApiError(
      'Something broke',
      'UNKNOWN_CODE',
      500,
      'req-mno'
    );
    const message = toUserMessage(error);
    expect(message).toBe('Something went wrong. Please try again (#req-mn)');
  });

  it('handles missing requestId gracefully', () => {
    const error = new ClientApiError('Error', 'UNAUTHORIZED', 401, null);
    const message = toUserMessage(error);
    expect(message).toBe('Please sign in to continue');
  });

  it('formats requestId with first 6 characters', () => {
    const error = new ClientApiError(
      'Error',
      'FORBIDDEN',
      403,
      'abcdefghijklmnop'
    );
    const message = toUserMessage(error);
    expect(message).toContain('(#abcdef)');
  });

  it('handles short requestIds', () => {
    const error = new ClientApiError('Error', 'UNAUTHORIZED', 401, 'abc');
    const message = toUserMessage(error);
    expect(message).toBe('Please sign in to continue (#abc)');
  });

  it('uses server message for BUSINESS_RULE_VIOLATION', () => {
    const error = new ClientApiError(
      'Cannot delete item with existing orders',
      'BUSINESS_RULE_VIOLATION',
      422,
      'req-pqr'
    );
    const message = toUserMessage(error);
    expect(message).toBe('Cannot delete item with existing orders (#req-pq)');
  });
});

