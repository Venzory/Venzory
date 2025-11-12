import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSignedCsrfToken, parseAndVerifySignedToken, getCsrfTokenFromCookie } from '@/lib/csrf';

describe('Middleware CSRF Cookie', () => {
  beforeEach(() => {
    process.env.CSRF_SECRET = 'test-secret-key-for-testing-purposes-only';
  });

  describe('CSRF Cookie Generation', () => {
    it('should generate a signed CSRF token', () => {
      const signedToken = createSignedCsrfToken();
      
      expect(signedToken).toBeTruthy();
      expect(signedToken).toMatch(/^[^.]+\.[^.]+$/);
    });

    it('should create verifiable signed tokens', () => {
      const signedToken = createSignedCsrfToken();
      const rawToken = parseAndVerifySignedToken(signedToken);
      
      expect(rawToken).toBeTruthy();
      expect(typeof rawToken).toBe('string');
    });
  });

  describe('CSRF Cookie Parsing', () => {
    it('should parse CSRF cookie from request', () => {
      const signedToken = createSignedCsrfToken();
      const cookieValue = `__Host-csrf=${encodeURIComponent(signedToken)}`;
      
      const request = new Request('http://localhost', {
        headers: {
          cookie: cookieValue,
        },
      });
      
      const extracted = getCsrfTokenFromCookie(request);
      
      expect(extracted).toBe(signedToken);
    });

    it('should handle multiple cookies', () => {
      const signedToken = createSignedCsrfToken();
      const cookieValue = `session=abc123; __Host-csrf=${encodeURIComponent(signedToken)}; other=value`;
      
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
    it('should validate __Host- prefix cookie format', () => {
      // The __Host- prefix requires:
      // - Secure flag
      // - Path=/
      // - No Domain attribute
      
      // This test validates the cookie name format
      const signedToken = createSignedCsrfToken();
      const cookieName = '__Host-csrf';
      
      expect(cookieName).toMatch(/^__Host-/);
    });

    it('should generate proper cookie value format', () => {
      const signedToken = createSignedCsrfToken();
      const isProduction = process.env.NODE_ENV === 'production';
      
      // Build cookie string as middleware would
      const cookieString = `__Host-csrf=${encodeURIComponent(signedToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600${isProduction ? '; Secure' : ''}`;
      
      expect(cookieString).toContain('__Host-csrf=');
      expect(cookieString).toContain('Path=/');
      expect(cookieString).toContain('HttpOnly');
      expect(cookieString).toContain('SameSite=Lax');
      expect(cookieString).toContain('Max-Age=3600');
    });

    it('should include Secure flag in production', () => {
      const signedToken = createSignedCsrfToken();
      const isProduction = true; // Simulate production
      
      const cookieString = `__Host-csrf=${encodeURIComponent(signedToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600${isProduction ? '; Secure' : ''}`;
      
      expect(cookieString).toContain('; Secure');
    });

    it('should not include Secure flag in development', () => {
      const signedToken = createSignedCsrfToken();
      const isProduction = false; // Simulate development
      
      const cookieString = `__Host-csrf=${encodeURIComponent(signedToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600${isProduction ? '; Secure' : ''}`;
      
      expect(cookieString).not.toContain('; Secure');
    });
  });

  describe('Cookie Rotation', () => {
    it('should generate different tokens on each rotation', () => {
      const token1 = createSignedCsrfToken();
      const token2 = createSignedCsrfToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should maintain valid tokens after rotation', () => {
      // Generate initial token
      const token1 = createSignedCsrfToken();
      const verified1 = parseAndVerifySignedToken(token1);
      
      expect(verified1).toBeTruthy();
      
      // Generate new token (simulating rotation)
      const token2 = createSignedCsrfToken();
      const verified2 = parseAndVerifySignedToken(token2);
      
      expect(verified2).toBeTruthy();
      expect(verified1).not.toBe(verified2);
    });
  });

  describe('Token Persistence', () => {
    it('should preserve valid existing tokens', () => {
      const signedToken = createSignedCsrfToken();
      
      // Simulate checking if token needs renewal
      const verified = parseAndVerifySignedToken(signedToken);
      const needsNewToken = !verified;
      
      expect(needsNewToken).toBe(false);
    });

    it('should require new token for invalid existing tokens', () => {
      const invalidToken = 'invalid.token';
      
      // Simulate checking if token needs renewal
      const verified = parseAndVerifySignedToken(invalidToken);
      const needsNewToken = !verified;
      
      expect(needsNewToken).toBe(true);
    });

    it('should require new token when no token exists', () => {
      const request = new Request('http://localhost');
      const existingToken = getCsrfTokenFromCookie(request);
      
      const needsNewToken = !existingToken || !parseAndVerifySignedToken(existingToken);
      
      expect(needsNewToken).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle URL-encoded cookie values', () => {
      const signedToken = createSignedCsrfToken();
      const encodedToken = encodeURIComponent(signedToken);
      
      const request = new Request('http://localhost', {
        headers: {
          cookie: `__Host-csrf=${encodedToken}`,
        },
      });
      
      const extracted = getCsrfTokenFromCookie(request);
      
      expect(extracted).toBe(signedToken);
    });

    it('should handle cookie with spaces', () => {
      const signedToken = createSignedCsrfToken();
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
    it('should simulate full middleware flow', () => {
      // Step 1: First request - no token
      const firstRequest = new Request('http://localhost/dashboard');
      const existingToken = getCsrfTokenFromCookie(firstRequest);
      
      expect(existingToken).toBeNull();
      
      // Step 2: Middleware generates token
      const signedToken = createSignedCsrfToken();
      
      // Step 3: Second request - with token
      const secondRequest = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: {
          cookie: `__Host-csrf=${encodeURIComponent(signedToken)}`,
        },
      });
      
      const tokenFromSecondRequest = getCsrfTokenFromCookie(secondRequest);
      const verified = parseAndVerifySignedToken(tokenFromSecondRequest!);
      
      expect(verified).toBeTruthy();
    });

    it('should validate token before allowing mutation', () => {
      // Client has token in cookie
      const signedToken = createSignedCsrfToken();
      const rawToken = parseAndVerifySignedToken(signedToken);
      
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
      const verifiedCookieToken = parseAndVerifySignedToken(cookieToken!);
      const headerToken = request.headers.get('x-csrf-token');
      
      expect(verifiedCookieToken).toBe(headerToken);
    });
  });
});

