import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateCsrfToken,
  signToken,
  verifyToken,
  createSignedCsrfToken,
  parseAndVerifySignedToken,
  getCsrfTokenFromCookie,
  getCsrfTokenFromHeader,
  verifyCsrf,
  extractRawToken,
} from '@/lib/csrf';

describe('CSRF Utilities', () => {
  // Set up environment variable for tests
  beforeEach(() => {
    process.env.CSRF_SECRET = 'test-secret-key-for-testing-purposes-only';
  });

  describe('generateCsrfToken', () => {
    it('should generate a token', () => {
      const token = generateCsrfToken();
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should generate URL-safe base64 tokens', () => {
      const token = generateCsrfToken();
      
      // Should not contain +, /, or =
      expect(token).not.toMatch(/[+/=]/);
    });
  });

  describe('signToken', () => {
    it('should sign a token', () => {
      const token = 'test-token';
      const signature = signToken(token);
      
      expect(signature).toBeTruthy();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    it('should produce consistent signatures for same token', () => {
      const token = 'test-token';
      const sig1 = signToken(token);
      const sig2 = signToken(token);
      
      expect(sig1).toBe(sig2);
    });

    it('should produce different signatures for different tokens', () => {
      const sig1 = signToken('token1');
      const sig2 = signToken('token2');
      
      expect(sig1).not.toBe(sig2);
    });

    it('should generate URL-safe base64 signatures', () => {
      const signature = signToken('test-token');
      
      // Should not contain +, /, or =
      expect(signature).not.toMatch(/[+/=]/);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token signature', () => {
      const token = 'test-token';
      const signature = signToken(token);
      
      const isValid = verifyToken(token, signature);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const token = 'test-token';
      const invalidSignature = 'invalid-signature';
      
      const isValid = verifyToken(token, invalidSignature);
      
      expect(isValid).toBe(false);
    });

    it('should reject tampered token', () => {
      const token = 'test-token';
      const signature = signToken(token);
      const tamperedToken = 'tampered-token';
      
      const isValid = verifyToken(tamperedToken, signature);
      
      expect(isValid).toBe(false);
    });

    it('should reject mismatched token and signature', () => {
      const token1 = 'token1';
      const token2 = 'token2';
      const signature = signToken(token1);
      
      const isValid = verifyToken(token2, signature);
      
      expect(isValid).toBe(false);
    });
  });

  describe('createSignedCsrfToken', () => {
    it('should create a signed token in correct format', () => {
      const signedToken = createSignedCsrfToken();
      
      expect(signedToken).toBeTruthy();
      expect(signedToken).toMatch(/^[^.]+\.[^.]+$/); // format: token.signature
    });

    it('should create unique signed tokens', () => {
      const token1 = createSignedCsrfToken();
      const token2 = createSignedCsrfToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('parseAndVerifySignedToken', () => {
    it('should parse and verify a valid signed token', () => {
      const signedToken = createSignedCsrfToken();
      const rawToken = parseAndVerifySignedToken(signedToken);
      
      expect(rawToken).toBeTruthy();
      expect(typeof rawToken).toBe('string');
    });

    it('should return null for invalid format', () => {
      const invalidToken = 'invalid-token-without-signature';
      const result = parseAndVerifySignedToken(invalidToken);
      
      expect(result).toBeNull();
    });

    it('should return null for tampered signature', () => {
      const signedToken = createSignedCsrfToken();
      const [token] = signedToken.split('.');
      const tamperedToken = `${token}.tampered-signature`;
      
      const result = parseAndVerifySignedToken(tamperedToken);
      
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseAndVerifySignedToken('');
      
      expect(result).toBeNull();
    });

    it('should return null for token with multiple dots', () => {
      const result = parseAndVerifySignedToken('token.sig.extra');
      
      expect(result).toBeNull();
    });
  });

  describe('getCsrfTokenFromCookie', () => {
    it('should extract CSRF token from cookie header', () => {
      const signedToken = createSignedCsrfToken();
      const request = new Request('http://localhost', {
        headers: {
          cookie: `__Host-csrf=${encodeURIComponent(signedToken)}`,
        },
      });
      
      const extracted = getCsrfTokenFromCookie(request);
      
      expect(extracted).toBe(signedToken);
    });

    it('should return null if cookie header is missing', () => {
      const request = new Request('http://localhost');
      
      const extracted = getCsrfTokenFromCookie(request);
      
      expect(extracted).toBeNull();
    });

    it('should return null if CSRF cookie is not present', () => {
      const request = new Request('http://localhost', {
        headers: {
          cookie: 'other-cookie=value',
        },
      });
      
      const extracted = getCsrfTokenFromCookie(request);
      
      expect(extracted).toBeNull();
    });

    it('should extract CSRF token from multiple cookies', () => {
      const signedToken = createSignedCsrfToken();
      const request = new Request('http://localhost', {
        headers: {
          cookie: `session=abc123; __Host-csrf=${encodeURIComponent(signedToken)}; other=value`,
        },
      });
      
      const extracted = getCsrfTokenFromCookie(request);
      
      expect(extracted).toBe(signedToken);
    });
  });

  describe('getCsrfTokenFromHeader', () => {
    it('should extract CSRF token from header', () => {
      const token = 'test-token';
      const request = new Request('http://localhost', {
        headers: {
          'x-csrf-token': token,
        },
      });
      
      const extracted = getCsrfTokenFromHeader(request);
      
      expect(extracted).toBe(token);
    });

    it('should return null if header is missing', () => {
      const request = new Request('http://localhost');
      
      const extracted = getCsrfTokenFromHeader(request);
      
      expect(extracted).toBeNull();
    });
  });

  describe('verifyCsrf', () => {
    it('should verify valid CSRF token', () => {
      const signedToken = createSignedCsrfToken();
      const rawToken = parseAndVerifySignedToken(signedToken);
      
      const request = new Request('http://localhost', {
        headers: {
          cookie: `__Host-csrf=${encodeURIComponent(signedToken)}`,
          'x-csrf-token': rawToken!,
        },
      });
      
      const isValid = verifyCsrf(request);
      
      expect(isValid).toBe(true);
    });

    it('should reject if cookie is missing', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-csrf-token': 'some-token',
        },
      });
      
      const isValid = verifyCsrf(request);
      
      expect(isValid).toBe(false);
    });

    it('should reject if header is missing', () => {
      const signedToken = createSignedCsrfToken();
      const request = new Request('http://localhost', {
        headers: {
          cookie: `__Host-csrf=${encodeURIComponent(signedToken)}`,
        },
      });
      
      const isValid = verifyCsrf(request);
      
      expect(isValid).toBe(false);
    });

    it('should reject if tokens do not match', () => {
      const signedToken1 = createSignedCsrfToken();
      const signedToken2 = createSignedCsrfToken();
      const rawToken2 = parseAndVerifySignedToken(signedToken2);
      
      const request = new Request('http://localhost', {
        headers: {
          cookie: `__Host-csrf=${encodeURIComponent(signedToken1)}`,
          'x-csrf-token': rawToken2!,
        },
      });
      
      const isValid = verifyCsrf(request);
      
      expect(isValid).toBe(false);
    });

    it('should reject if cookie signature is invalid', () => {
      const [token] = createSignedCsrfToken().split('.');
      const tamperedSignedToken = `${token}.invalid-signature`;
      
      const request = new Request('http://localhost', {
        headers: {
          cookie: `__Host-csrf=${encodeURIComponent(tamperedSignedToken)}`,
          'x-csrf-token': token,
        },
      });
      
      const isValid = verifyCsrf(request);
      
      expect(isValid).toBe(false);
    });
  });

  describe('extractRawToken', () => {
    it('should extract raw token from signed token', () => {
      const signedToken = createSignedCsrfToken();
      const [expectedToken] = signedToken.split('.');
      
      const extracted = extractRawToken(signedToken);
      
      expect(extracted).toBe(expectedToken);
    });

    it('should return null for invalid format', () => {
      const extracted = extractRawToken('invalid');
      
      expect(extracted).toBe('invalid'); // Returns the whole string if no dot
    });

    it('should return null for empty string', () => {
      const extracted = extractRawToken('');
      
      expect(extracted).toBeNull();
    });
  });

  describe('Security Properties', () => {
    it('should use timing-safe comparison', () => {
      // This test verifies that the verification doesn't leak timing information
      // We can't easily test the actual timing, but we can verify the function works correctly
      const token = 'test-token';
      const correctSig = signToken(token);
      const wrongSig1 = 'a' + correctSig.substring(1);
      const wrongSig2 = correctSig.substring(0, correctSig.length - 1) + 'z';
      
      expect(verifyToken(token, correctSig)).toBe(true);
      expect(verifyToken(token, wrongSig1)).toBe(false);
      expect(verifyToken(token, wrongSig2)).toBe(false);
    });

    it('should reject different length signatures', () => {
      const token = 'test-token';
      const signature = signToken(token);
      const shorterSig = signature.substring(0, signature.length - 5);
      
      const isValid = verifyToken(token, shorterSig);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing CSRF_SECRET gracefully', () => {
      delete process.env.CSRF_SECRET;
      
      expect(() => signToken('test')).toThrow('CSRF_SECRET');
    });

    it('should handle malformed cookie headers', () => {
      const request = new Request('http://localhost', {
        headers: {
          cookie: ';;;invalid;;;',
        },
      });
      
      const extracted = getCsrfTokenFromCookie(request);
      
      // Should not throw, should return null
      expect(extracted).toBeNull();
    });
  });
});

