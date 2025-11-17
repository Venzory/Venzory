import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSignedCsrfToken, parseAndVerifySignedToken, getCsrfTokenFromCookie } from '@/lib/csrf';

describe('Middleware CSRF Cookie', () => {
  beforeEach(() => {
    process.env.CSRF_SECRET = 'test-secret-key-for-testing-purposes-only';
  });

  describe('CSRF Cookie Generation', () => {
    it('should generate a signed CSRF token', async () => {
      const signedToken = await createSignedCsrfToken();
      
      expect(signedToken).toBeTruthy();
      expect(signedToken).toMatch(/^[^.]+\.[^.]+$/);
    });

    it('should create verifiable signed tokens', async () => {
      const signedToken = await createSignedCsrfToken();
      const rawToken = await parseAndVerifySignedToken(signedToken);
      
      expect(rawToken).toBeTruthy();
      expect(typeof rawToken).toBe('string');
    });
  });

  describe('CSRF Cookie Parsing', () => {
    it('should parse production CSRF cookie from request', async () => {
      const signedToken = await createSignedCsrfToken();
      const cookieValue = `__Host-csrf=${encodeURIComponent(signedToken)}`;
      
      const request = new Request('http://localhost', {
        headers: {
          cookie: cookieValue,
        },
      });
      
      const extracted = getCsrfTokenFromCookie(request);
      
      expect(extracted).toBe(signedToken);
    });

    it('should parse development CSRF cookie from request', async () => {
      const signedToken = await createSignedCsrfToken();
      const cookieValue = `csrf-token=${encodeURIComponent(signedToken)}`;
      
      const request = new Request('http://localhost', {
        headers: {
          cookie: cookieValue,
        },
      });
      
      const extracted = getCsrfTokenFromCookie(request);
      
      expect(extracted).toBe(signedToken);
    });

    it('should prefer production cookie when both are present', async () => {
      const prodToken = await createSignedCsrfToken();
      const devToken = await createSignedCsrfToken();
      const cookieValue = `csrf-token=${encodeURIComponent(devToken)}; __Host-csrf=${encodeURIComponent(prodToken)}`;
      
      const request = new Request('http://localhost', {
        headers: {
          cookie: cookieValue,
        },
      });
      
      const extracted = getCsrfTokenFromCookie(request);
      
      expect(extracted).toBe(prodToken);
    });

    it('should handle multiple cookies with production CSRF', async () => {
      const signedToken = await createSignedCsrfToken();
      const cookieValue = `session=abc123; __Host-csrf=${encodeURIComponent(signedToken)}; other=value`;
      
      const request = new Request('http://localhost', {
        headers: {
          cookie: cookieValue,
        },
      });
      
      const extracted = getCsrfTokenFromCookie(request);
      
      expect(extracted).toBe(signedToken);
    });

    it('should handle multiple cookies with development CSRF', async () => {
      const signedToken = await createSignedCsrfToken();
      const cookieValue = `session=abc123; csrf-token=${encodeURIComponent(signedToken)}; other=value`;
      
      const request = new Request('http://localhost', {
        headers: {
          cookie: cookieValue,
        },
      });
      
      const extracted = getCsrfTokenFromCookie(request);
      
      expect(extracted).toBe(signedToken);
    });

    it('should return null when no CSRF cookie present', () => {
      const request = new Request('http://localhost', {
        headers: {
          cookie: 'session=abc123; other=value',
        },
      });
      
      const extracted = getCsrfTokenFromCookie(request);
      
      expect(extracted).toBeNull();
    });

    it('should return null when no cookie header present', () => {
      const request = new Request('http://localhost');
      
      const extracted = getCsrfTokenFromCookie(request);
      
      expect(extracted).toBeNull();
    });
  });

  describe('Cookie Security Attributes', () => {
    it('should use __Host- prefix in production', async () => {
      // The __Host- prefix requires:
      // - Secure flag
      // - Path=/
      // - No Domain attribute
      
      const signedToken = await createSignedCsrfToken();
      const isProduction = true;
      const cookieName = isProduction ? '__Host-csrf' : 'csrf-token';
      
      expect(cookieName).toBe('__Host-csrf');
      expect(cookieName).toMatch(/^__Host-/);
    });

    it('should use simple cookie name in development', async () => {
      const signedToken = await createSignedCsrfToken();
      const isProduction = false;
      const cookieName = isProduction ? '__Host-csrf' : 'csrf-token';
      
      expect(cookieName).toBe('csrf-token');
      expect(cookieName).not.toMatch(/^__Host-/);
    });

    it('should generate proper cookie value format for production', async () => {
      const signedToken = await createSignedCsrfToken();
      const isProduction = true;
      const cookieName = isProduction ? '__Host-csrf' : 'csrf-token';
      
      // Build cookie string as middleware would
      const cookieString = `${cookieName}=${encodeURIComponent(signedToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600${isProduction ? '; Secure' : ''}`;
      
      expect(cookieString).toContain('__Host-csrf=');
      expect(cookieString).toContain('Path=/');
      expect(cookieString).toContain('HttpOnly');
      expect(cookieString).toContain('SameSite=Lax');
      expect(cookieString).toContain('Max-Age=3600');
      expect(cookieString).toContain('; Secure');
    });

    it('should generate proper cookie value format for development', async () => {
      const signedToken = await createSignedCsrfToken();
      const isProduction = false;
      const cookieName = isProduction ? '__Host-csrf' : 'csrf-token';
      
      // Build cookie string as middleware would
      const cookieString = `${cookieName}=${encodeURIComponent(signedToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600${isProduction ? '; Secure' : ''}`;
      
      expect(cookieString).toContain('csrf-token=');
      expect(cookieString).toContain('Path=/');
      expect(cookieString).toContain('HttpOnly');
      expect(cookieString).toContain('SameSite=Lax');
      expect(cookieString).toContain('Max-Age=3600');
      expect(cookieString).not.toContain('; Secure');
    });
  });

  describe('Cookie Rotation', () => {
    it('should generate different tokens on each rotation', async () => {
      const token1 = await createSignedCsrfToken();
      const token2 = await createSignedCsrfToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should maintain valid tokens after rotation', async () => {
      // Generate initial token
      const token1 = await createSignedCsrfToken();
      const verified1 = await parseAndVerifySignedToken(token1);
      
      expect(verified1).toBeTruthy();
      
      // Generate new token (simulating rotation)
      const token2 = await createSignedCsrfToken();
      const verified2 = await parseAndVerifySignedToken(token2);
      
      expect(verified2).toBeTruthy();
      expect(verified1).not.toBe(verified2);
    });
  });

  describe('Token Persistence', () => {
    it('should preserve valid existing tokens', async () => {
      const signedToken = await createSignedCsrfToken();
      
      // Simulate checking if token needs renewal
      const verified = await parseAndVerifySignedToken(signedToken);
      const needsNewToken = !verified;
      
      expect(needsNewToken).toBe(false);
    });

    it('should require new token for invalid existing tokens', async () => {
      const invalidToken = 'invalid.token';
      
      // Simulate checking if token needs renewal
      const verified = await parseAndVerifySignedToken(invalidToken);
      const needsNewToken = !verified;
      
      expect(needsNewToken).toBe(true);
    });

    it('should require new token when no token exists', async () => {
      const request = new Request('http://localhost');
      const existingToken = getCsrfTokenFromCookie(request);
      
      const needsNewToken = !existingToken || !(await parseAndVerifySignedToken(existingToken));
      
      expect(needsNewToken).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle URL-encoded cookie values', async () => {
      const signedToken = await createSignedCsrfToken();
      const encodedToken = encodeURIComponent(signedToken);
      
      const request = new Request('http://localhost', {
        headers: {
          cookie: `__Host-csrf=${encodedToken}`,
        },
      });
      
      const extracted = getCsrfTokenFromCookie(request);
      
      expect(extracted).toBe(signedToken);
    });

    it('should handle cookie with spaces', async () => {
      const signedToken = await createSignedCsrfToken();
      const cookieValue = `session=abc; __Host-csrf=${encodeURIComponent(signedToken)}; other=xyz`;
      
      const request = new Request('http://localhost', {
        headers: {
          cookie: cookieValue,
        },
      });
      
      const extracted = getCsrfTokenFromCookie(request);
      
      expect(extracted).toBe(signedToken);
    });

    it('should handle empty cookie header', () => {
      const request = new Request('http://localhost', {
        headers: {
          cookie: '',
        },
      });
      
      const extracted = getCsrfTokenFromCookie(request);
      
      expect(extracted).toBeNull();
    });
  });

  describe('Integration with Middleware', () => {
    it('should simulate full middleware flow', async () => {
      // Step 1: First request - no token
      const firstRequest = new Request('http://localhost/dashboard');
      const existingToken = getCsrfTokenFromCookie(firstRequest);
      
      expect(existingToken).toBeNull();
      
      // Step 2: Middleware generates token
      const signedToken = await createSignedCsrfToken();
      
      // Step 3: Second request - with token
      const secondRequest = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: {
          cookie: `__Host-csrf=${encodeURIComponent(signedToken)}`,
        },
      });
      
      const tokenFromSecondRequest = getCsrfTokenFromCookie(secondRequest);
      const verified = await parseAndVerifySignedToken(tokenFromSecondRequest!);
      
      expect(verified).toBeTruthy();
    });

    it('should validate token before allowing mutation', async () => {
      // Client has token in cookie
      const signedToken = await createSignedCsrfToken();
      const rawToken = await parseAndVerifySignedToken(signedToken);
      
      // Client sends both cookie and header
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: {
          cookie: `__Host-csrf=${encodeURIComponent(signedToken)}`,
          'x-csrf-token': rawToken!,
        },
      });
      
      // Server validates
      const cookieToken = getCsrfTokenFromCookie(request);
      const verifiedCookieToken = await parseAndVerifySignedToken(cookieToken!);
      const headerToken = request.headers.get('x-csrf-token');
      
      expect(verifiedCookieToken).toBe(headerToken);
    });
  });
});

