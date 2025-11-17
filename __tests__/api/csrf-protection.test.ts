import { describe, it, expect, beforeEach, vi } from 'vitest';
import { withCsrfProtection, withCsrfProtectionContext } from '@/lib/api-handler';
import { createSignedCsrfToken, parseAndVerifySignedToken } from '@/lib/csrf';
import { NextResponse } from 'next/server';

describe('API CSRF Protection', () => {
  beforeEach(() => {
    process.env.CSRF_SECRET = 'test-secret-key-for-testing-purposes-only';
  });

  describe('withCsrfProtection', () => {
    it('should allow GET requests without CSRF token', async () => {
      const handler = vi.fn(() => NextResponse.json({ success: true }));
      const wrappedHandler = withCsrfProtection(handler);

      const request = new Request('http://localhost/api/test', {
        method: 'GET',
      });

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).toHaveBeenCalled();
      expect(data).toEqual({ success: true });
    });

    it('should allow HEAD requests without CSRF token', async () => {
      const handler = vi.fn(() => new Response(null, { status: 200 }));
      const wrappedHandler = withCsrfProtection(handler);

      const request = new Request('http://localhost/api/test', {
        method: 'HEAD',
      });

      const response = await wrappedHandler(request);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should allow OPTIONS requests without CSRF token', async () => {
      const handler = vi.fn(() => new Response(null, { status: 200 }));
      const wrappedHandler = withCsrfProtection(handler);

      const request = new Request('http://localhost/api/test', {
        method: 'OPTIONS',
      });

      const response = await wrappedHandler(request);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should reject POST request without CSRF token', async () => {
      const handler = vi.fn(() => NextResponse.json({ success: true }));
      const wrappedHandler = withCsrfProtection(handler);

      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Invalid request' });
    });

    it('should reject PUT request without CSRF token', async () => {
      const handler = vi.fn(() => NextResponse.json({ success: true }));
      const wrappedHandler = withCsrfProtection(handler);

      const request = new Request('http://localhost/api/test', {
        method: 'PUT',
        body: JSON.stringify({ data: 'test' }),
      });

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Invalid request' });
    });

    it('should reject PATCH request without CSRF token', async () => {
      const handler = vi.fn(() => NextResponse.json({ success: true }));
      const wrappedHandler = withCsrfProtection(handler);

      const request = new Request('http://localhost/api/test', {
        method: 'PATCH',
        body: JSON.stringify({ data: 'test' }),
      });

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Invalid request' });
    });

    it('should reject DELETE request without CSRF token', async () => {
      const handler = vi.fn(() => NextResponse.json({ success: true }));
      const wrappedHandler = withCsrfProtection(handler);

      const request = new Request('http://localhost/api/test', {
        method: 'DELETE',
      });

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Invalid request' });
    });

    it('should allow POST request with valid CSRF token', async () => {
      const handler = vi.fn(() => NextResponse.json({ success: true }));
      const wrappedHandler = withCsrfProtection(handler);

      const signedToken = await createSignedCsrfToken();
      const rawToken = await parseAndVerifySignedToken(signedToken);

      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'Cookie': `__Host-csrf=${encodeURIComponent(signedToken)}`,
          'X-CSRF-Token': rawToken!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: 'test' }),
      });

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });

    it('should reject POST request with invalid CSRF token', async () => {
      const handler = vi.fn(() => NextResponse.json({ success: true }));
      const wrappedHandler = withCsrfProtection(handler);

      const signedToken = await createSignedCsrfToken();

      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'Cookie': `__Host-csrf=${encodeURIComponent(signedToken)}`,
          'X-CSRF-Token': 'invalid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: 'test' }),
      });

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Invalid request' });
    });

    it('should reject POST request with mismatched tokens', async () => {
      const handler = vi.fn(() => NextResponse.json({ success: true }));
      const wrappedHandler = withCsrfProtection(handler);

      const signedToken1 = await createSignedCsrfToken();
      const signedToken2 = await createSignedCsrfToken();
      const rawToken2 = await parseAndVerifySignedToken(signedToken2);

      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'Cookie': `__Host-csrf=${encodeURIComponent(signedToken1)}`,
          'X-CSRF-Token': rawToken2!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: 'test' }),
      });

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Invalid request' });
    });

    it('should bypass CSRF check when explicitly requested', async () => {
      const handler = vi.fn(() => NextResponse.json({ success: true }));
      const wrappedHandler = withCsrfProtection(handler, { bypassCsrf: true });

      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });

    it('should bypass CSRF check for /api/auth/* routes', async () => {
      const handler = vi.fn(() => NextResponse.json({ success: true }));
      const wrappedHandler = withCsrfProtection(handler);

      const request = new Request('http://localhost/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });

    it('should bypass CSRF check for /api/health route', async () => {
      const handler = vi.fn(() => NextResponse.json({ status: 'ok' }));
      const wrappedHandler = withCsrfProtection(handler);

      const request = new Request('http://localhost/api/health', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(data).toEqual({ status: 'ok' });
    });
  });

  describe('withCsrfProtectionContext', () => {
    it('should pass context parameter to handler', async () => {
      const handler = vi.fn(async (req, { params }) => {
        const { id } = await params;
        return NextResponse.json({ id });
      });
      const wrappedHandler = withCsrfProtectionContext(handler);

      const signedToken = await createSignedCsrfToken();
      const rawToken = await parseAndVerifySignedToken(signedToken);

      const request = new Request('http://localhost/api/items/123', {
        method: 'PATCH',
        headers: {
          'Cookie': `__Host-csrf=${encodeURIComponent(signedToken)}`,
          'X-CSRF-Token': rawToken!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: 'test' }),
      });

      const context = { params: Promise.resolve({ id: '123' }) };
      const response = await wrappedHandler(request, context);
      const data = await response.json();

      expect(handler).toHaveBeenCalledWith(request, context);
      expect(data).toEqual({ id: '123' });
    });

    it('should reject PATCH request without CSRF token', async () => {
      const handler = vi.fn(async (req, { params }) => {
        const { id } = await params;
        return NextResponse.json({ id });
      });
      const wrappedHandler = withCsrfProtectionContext(handler);

      const request = new Request('http://localhost/api/items/123', {
        method: 'PATCH',
        body: JSON.stringify({ data: 'test' }),
      });

      const context = { params: Promise.resolve({ id: '123' }) };
      const response = await wrappedHandler(request, context);
      const data = await response.json();

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Invalid request' });
    });

    it('should allow GET request without CSRF token', async () => {
      const handler = vi.fn(async (req, { params }) => {
        const { id } = await params;
        return NextResponse.json({ id });
      });
      const wrappedHandler = withCsrfProtectionContext(handler);

      const request = new Request('http://localhost/api/items/123', {
        method: 'GET',
      });

      const context = { params: Promise.resolve({ id: '123' }) };
      const response = await wrappedHandler(request, context);
      const data = await response.json();

      expect(handler).toHaveBeenCalled();
      expect(data).toEqual({ id: '123' });
    });
  });

  describe('CSRF Token Lifecycle', () => {
    it('should accept token immediately after generation', async () => {
      const handler = vi.fn(() => NextResponse.json({ success: true }));
      const wrappedHandler = withCsrfProtection(handler);

      // Simulate middleware generating and setting cookie
      const signedToken = await createSignedCsrfToken();
      const rawToken = await parseAndVerifySignedToken(signedToken);

      // Client makes request with token
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'Cookie': `__Host-csrf=${encodeURIComponent(signedToken)}`,
          'X-CSRF-Token': rawToken!,
        },
        body: JSON.stringify({ data: 'test' }),
      });

      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
    });

    it('should reject tampered cookie signature', async () => {
      const handler = vi.fn(() => NextResponse.json({ success: true }));
      const wrappedHandler = withCsrfProtection(handler);

      const signedToken = await createSignedCsrfToken();
      const [token] = signedToken.split('.');
      const tamperedToken = `${token}.tampered-signature`;
      
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'Cookie': `__Host-csrf=${encodeURIComponent(tamperedToken)}`,
          'X-CSRF-Token': token,
        },
        body: JSON.stringify({ data: 'test' }),
      });

      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Invalid request' });
    });
  });
});

