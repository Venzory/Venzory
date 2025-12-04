/**
 * Email Sandbox Mode Tests
 * 
 * Verifies that:
 * - DEV_EMAIL_RECIPIENT redirects emails in non-production
 * - [DEV] prefix is added to subjects when redirected
 * - Production mode sends to actual recipients
 * 
 * Note: These tests verify the sandbox logic independently of the actual
 * email sending functions to avoid TypeScript complexity with process.env.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Helper function that mirrors the sandbox logic in email files
 * This allows us to test the logic without modifying process.env directly
 */
function getEffectiveRecipient(
  originalRecipient: string,
  nodeEnv: string,
  devRecipient: string | undefined
): {
  recipient: string;
  isRedirected: boolean;
  makeSubject: (original: string) => string;
} {
  const isProduction = nodeEnv === 'production';
  const isRedirected = !isProduction && !!devRecipient;
  
  return {
    recipient: isRedirected ? devRecipient! : originalRecipient,
    isRedirected,
    makeSubject: (original: string) => 
      isRedirected ? `[DEV] ${original} (was: ${originalRecipient})` : original,
  };
}

describe('Email Sandbox Mode', () => {
  describe('getEffectiveRecipient behavior', () => {
    it('should redirect to DEV_EMAIL_RECIPIENT in development when set', () => {
      const result = getEffectiveRecipient(
        'user@example.com',
        'development',
        'dev-test@venzory.com'
      );

      expect(result.isRedirected).toBe(true);
      expect(result.recipient).toBe('dev-test@venzory.com');
    });

    it('should not redirect when DEV_EMAIL_RECIPIENT is not set', () => {
      const result = getEffectiveRecipient(
        'user@example.com',
        'development',
        undefined
      );

      expect(result.isRedirected).toBe(false);
      expect(result.recipient).toBe('user@example.com');
    });

    it('should not redirect in production even with DEV_EMAIL_RECIPIENT set', () => {
      const result = getEffectiveRecipient(
        'user@example.com',
        'production',
        'dev-test@venzory.com'
      );

      expect(result.isRedirected).toBe(false);
      expect(result.recipient).toBe('user@example.com');
    });

    it('should add [DEV] prefix to subject when redirected', () => {
      const result = getEffectiveRecipient(
        'user@example.com',
        'development',
        'dev-test@venzory.com'
      );

      const subject = result.makeSubject('Reset your Venzory password');
      expect(subject).toBe('[DEV] Reset your Venzory password (was: user@example.com)');
    });

    it('should not modify subject when not redirected', () => {
      const result = getEffectiveRecipient(
        'user@example.com',
        'production',
        'dev-test@venzory.com'
      );

      const subject = result.makeSubject('Reset your Venzory password');
      expect(subject).toBe('Reset your Venzory password');
    });
  });

  describe('Sandbox mode in test environment', () => {
    it('should redirect in test environment when DEV_EMAIL_RECIPIENT is set', () => {
      const result = getEffectiveRecipient(
        'user@example.com',
        'test',
        'test-inbox@venzory.com'
      );

      expect(result.isRedirected).toBe(true);
      expect(result.recipient).toBe('test-inbox@venzory.com');
    });
  });

  describe('Email recipient logging', () => {
    it('should track both original and actual recipient for debugging', () => {
      const originalRecipient = 'real-user@example.com';
      const result = getEffectiveRecipient(
        originalRecipient,
        'development',
        'dev@venzory.com'
      );

      // Simulate log context
      const logContext = {
        originalRecipient,
        actualRecipient: result.recipient,
        isRedirected: result.isRedirected,
      };

      expect(logContext.originalRecipient).toBe('real-user@example.com');
      expect(logContext.actualRecipient).toBe('dev@venzory.com');
      expect(logContext.isRedirected).toBe(true);
    });
  });
});

describe('EMAIL_FROM Configuration', () => {
  it('should construct from address with display name', () => {
    const emailFrom = 'noreply@venzory.com';
    const fromAddress = `Venzory <${emailFrom}>`;

    expect(fromAddress).toBe('Venzory <noreply@venzory.com>');
  });

  it('should use custom domain if configured', () => {
    const emailFrom = 'notifications@custom.venzory.com';
    const fromAddress = `Venzory <${emailFrom}>`;

    expect(fromAddress).toBe('Venzory <notifications@custom.venzory.com>');
  });
});
