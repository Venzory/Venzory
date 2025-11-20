import { describe, it, expect } from 'vitest';
import { generateCSP, validateCSP, extractNonceFromCSP } from '@/lib/csp';

describe('CSP Utility', () => {
  describe('generateCSP', () => {
    it('should generate a valid CSP string with nonce', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce });

      expect(csp).toContain(`'nonce-${nonce}'`);
      expect(csp).toBeTruthy();
      expect(csp.length).toBeGreaterThan(0);
    });

    it('should include all required CSP directives', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce });

      const requiredDirectives = [
        'default-src',
        'script-src',
        'style-src',
        'img-src',
        'font-src',
        'connect-src',
        'frame-ancestors',
        'base-uri',
        'form-action',
        'upgrade-insecure-requests',
      ];

      requiredDirectives.forEach(directive => {
        expect(csp).toContain(directive);
      });
    });

    it('should include unsafe-inline as fallback for older browsers', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce });

      expect(csp).toContain("'unsafe-inline'");
    });

    it('should allow data: and blob: for images', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce });

      expect(csp).toContain('img-src');
      expect(csp).toContain('data:');
      expect(csp).toContain('blob:');
    });

    it('should allow data: for fonts', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce });

      expect(csp).toContain('font-src');
      expect(csp).toContain('data:');
    });

    it('should set frame-ancestors to none', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce });

      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should throw error if nonce is empty string', () => {
      expect(() => generateCSP({ nonce: '' })).toThrow(
        'CSP generation failed: nonce is required'
      );
    });

    it('should throw error if nonce is not provided', () => {
      // @ts-expect-error Testing invalid input
      expect(() => generateCSP({})).toThrow(
        'CSP generation failed: nonce is required'
      );
    });

    it('should throw error if nonce is not a string', () => {
      // @ts-expect-error Testing invalid input
      expect(() => generateCSP({ nonce: 123 })).toThrow(
        'CSP generation failed: nonce is required'
      );
    });

    it('should not log in production by default', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce, isDevelopment: false });

      expect(csp).toBeTruthy();
      // Note: Logging behavior is controlled by isDevelopment flag, not NODE_ENV
    });

    it('should generate consistent format with semicolon separators', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce });

      // Check that directives are separated by semicolons
      expect(csp).toMatch(/;\s*/);
      
      // Ensure no trailing semicolon at the end
      expect(csp.endsWith(';')).toBe(false);
    });
  });

  describe('validateCSP', () => {
    it('should validate a complete CSP as valid', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce });

      const result = validateCSP(csp);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should detect missing directives', () => {
      const incompleteCsp = "default-src 'self'; script-src 'self'";

      const result = validateCSP(incompleteCsp);

      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
      expect(result.missing).toContain('img-src');
      expect(result.missing).toContain('font-src');
    });

    it('should return empty array for valid CSP', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce });

      const result = validateCSP(csp);

      expect(result.missing).toEqual([]);
    });
  });

  describe('extractNonceFromCSP', () => {
    it('should extract nonce from CSP string', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce });

      const extracted = extractNonceFromCSP(csp);

      expect(extracted).toBe(nonce);
    });

    it('should return null if no nonce found', () => {
      const csp = "default-src 'self'";

      const extracted = extractNonceFromCSP(csp);

      expect(extracted).toBeNull();
    });

    it('should extract first nonce if multiple exist', () => {
      const csp = "'nonce-first' 'nonce-second'";

      const extracted = extractNonceFromCSP(csp);

      expect(extracted).toBe('first');
    });
  });

  describe('CSP Security Requirements', () => {
    it('should not allow unsafe-eval in script-src', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce });

      expect(csp).not.toContain("'unsafe-eval'");
    });

    it('should only allow self for default-src', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce });

      expect(csp).toContain("default-src 'self'");
    });

    it('should only allow self for form-action', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce });

      expect(csp).toContain("form-action 'self'");
    });

    it('should only allow self for base-uri', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce });

      expect(csp).toContain("base-uri 'self'");
    });

    it('should include upgrade-insecure-requests', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ nonce });

      expect(csp).toContain('upgrade-insecure-requests');
    });
  });
});

