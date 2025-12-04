/**
 * Email Templates Unit Tests
 * 
 * Verifies that:
 * - BaseEmailLayout renders without crashing
 * - All templates can be rendered with realistic payloads
 * - Required fields are present in rendered output
 */

import { describe, it, expect } from 'vitest';
import {
  renderBaseEmailLayout,
  renderEmailButton,
  renderEmailLink,
  renderEmailDivider,
  renderEmailParagraph,
  renderEmailInfoBox,
  EMAIL_STYLES,
} from '@/src/lib/email/templates/base-layout';
import {
  renderPasswordResetEmailHtml,
  renderPasswordResetEmailText,
} from '@/src/lib/email/templates/password-reset';
import {
  renderUserInviteEmailHtml,
  renderUserInviteEmailText,
} from '@/src/lib/email/templates/user-invite';
import {
  renderMagicLinkEmailHtml,
  renderMagicLinkEmailText,
} from '@/src/lib/email/templates/magic-link';
import {
  renderOrderEmailHtml,
} from '@/src/lib/email/templates/order/html';
import {
  renderOrderEmailText,
} from '@/src/lib/email/templates/order/text';

describe('Email Templates', () => {
  describe('BaseEmailLayout', () => {
    it('should render without crashing with minimal options', () => {
      const html = renderBaseEmailLayout({
        title: 'Test Title',
        content: '<p>Test content</p>',
      });

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('should include title in rendered output', () => {
      const html = renderBaseEmailLayout({
        title: 'My Custom Title',
        content: '<p>Content</p>',
      });

      expect(html).toContain('My Custom Title');
    });

    it('should include subtitle when provided', () => {
      const html = renderBaseEmailLayout({
        title: 'Title',
        subtitle: 'My Subtitle',
        content: '<p>Content</p>',
      });

      expect(html).toContain('My Subtitle');
    });

    it('should include preheader when provided', () => {
      const html = renderBaseEmailLayout({
        title: 'Title',
        preheader: 'Preview text for email client',
        content: '<p>Content</p>',
      });

      expect(html).toContain('Preview text for email client');
      // Preheader should be hidden
      expect(html).toContain('display: none');
    });

    it('should include content in body', () => {
      const html = renderBaseEmailLayout({
        title: 'Title',
        content: '<p>My unique content here</p>',
      });

      expect(html).toContain('My unique content here');
    });

    it('should include copyright footer', () => {
      const currentYear = new Date().getFullYear();
      const html = renderBaseEmailLayout({
        title: 'Title',
        content: '<p>Content</p>',
      });

      expect(html).toContain('Venzory');
      expect(html).toContain(String(currentYear));
    });

    it('should use consistent brand colors from EMAIL_STYLES', () => {
      const html = renderBaseEmailLayout({
        title: 'Title',
        content: '<p>Content</p>',
      });

      expect(html).toContain(EMAIL_STYLES.primaryColor);
      expect(html).toContain(EMAIL_STYLES.primaryDark);
    });
  });

  describe('BaseEmailLayout Helpers', () => {
    it('renderEmailButton should render a clickable button', () => {
      const html = renderEmailButton({
        href: 'https://example.com/action',
        text: 'Click Me',
      });

      expect(html).toContain('https://example.com/action');
      expect(html).toContain('Click Me');
      expect(html).toContain('<a');
    });

    it('renderEmailLink should render a copy-paste link section', () => {
      const html = renderEmailLink('https://example.com/long-link');

      expect(html).toContain('https://example.com/long-link');
      expect(html).toContain('copy and paste');
    });

    it('renderEmailParagraph should render with muted option', () => {
      const html = renderEmailParagraph('Muted text', { muted: true });

      expect(html).toContain('Muted text');
      expect(html).toContain(EMAIL_STYLES.textSecondary);
    });

    it('renderEmailInfoBox should render different variants', () => {
      const infoBox = renderEmailInfoBox({
        title: 'Info Title',
        content: 'Info content',
        variant: 'info',
      });
      const warningBox = renderEmailInfoBox({
        content: 'Warning content',
        variant: 'warning',
      });

      expect(infoBox).toContain('Info Title');
      expect(infoBox).toContain(EMAIL_STYLES.primaryColor);
      expect(warningBox).toContain('#f59e0b'); // Warning amber color
    });
  });

  describe('Password Reset Template', () => {
    const validPayload = {
      name: 'John Doe',
      resetUrl: 'https://app.venzory.com/auth/reset-password/abc123token',
    };

    it('should render HTML without crashing', () => {
      const html = renderPasswordResetEmailHtml(validPayload);

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
    });

    it('should include user name in greeting', () => {
      const html = renderPasswordResetEmailHtml(validPayload);

      expect(html).toContain('John Doe');
    });

    it('should fall back to "there" when name is null', () => {
      const html = renderPasswordResetEmailHtml({
        name: null,
        resetUrl: 'https://example.com/reset',
      });

      expect(html).toContain('Hi there');
    });

    it('should include reset URL in button and link', () => {
      const html = renderPasswordResetEmailHtml(validPayload);

      // Should appear at least twice (button href and fallback text)
      const urlCount = (html.match(/abc123token/g) || []).length;
      expect(urlCount).toBeGreaterThanOrEqual(2);
    });

    it('should include preheader text', () => {
      const html = renderPasswordResetEmailHtml(validPayload);

      expect(html).toContain('expires in 60 minutes');
    });

    it('should include "Reset Password" CTA', () => {
      const html = renderPasswordResetEmailHtml(validPayload);

      expect(html).toContain('Reset Password');
    });

    it('should render text version without HTML', () => {
      const text = renderPasswordResetEmailText(validPayload);

      expect(text).not.toContain('<');
      expect(text).toContain('John Doe');
      expect(text).toContain('abc123token');
      expect(text).toContain('60 minutes');
    });
  });

  describe('User Invite Template', () => {
    const validPayload = {
      practiceName: 'Acme Dental',
      role: 'ADMIN' as const,
      inviterName: 'Jane Manager',
      inviteUrl: 'https://app.venzory.com/auth/accept-invite/invite123',
    };

    it('should render HTML without crashing', () => {
      const html = renderUserInviteEmailHtml(validPayload);

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
    });

    it('should include practice name', () => {
      const html = renderUserInviteEmailHtml(validPayload);

      expect(html).toContain('Acme Dental');
    });

    it('should include formatted role', () => {
      const html = renderUserInviteEmailHtml(validPayload);

      expect(html).toContain('Admin');
    });

    it('should include inviter name', () => {
      const html = renderUserInviteEmailHtml(validPayload);

      expect(html).toContain('Jane Manager');
    });

    it('should fall back to "An administrator" when inviter not provided', () => {
      const html = renderUserInviteEmailHtml({
        ...validPayload,
        inviterName: undefined,
      });

      expect(html).toContain('An administrator');
    });

    it('should include "Accept Invitation" CTA', () => {
      const html = renderUserInviteEmailHtml(validPayload);

      expect(html).toContain('Accept Invitation');
    });

    it('should include preheader with inviter and practice', () => {
      const html = renderUserInviteEmailHtml(validPayload);

      // Preheader contains practice name
      expect(html).toContain('Acme Dental');
    });

    it('should mention 7 day expiry', () => {
      const html = renderUserInviteEmailHtml(validPayload);

      expect(html).toContain('7 days');
    });

    it('should render text version', () => {
      const text = renderUserInviteEmailText(validPayload);

      expect(text).not.toContain('<');
      expect(text).toContain('Acme Dental');
      expect(text).toContain('Admin');
      expect(text).toContain('invite123');
    });
  });

  describe('Magic Link Template', () => {
    const validPayload = {
      host: 'app.venzory.com',
      url: 'https://app.venzory.com/api/auth/callback/resend?token=magic123',
      loginCode: '123456',
    };

    it('should render HTML without crashing', () => {
      const html = renderMagicLinkEmailHtml(validPayload);

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
    });

    it('should include host in title', () => {
      const html = renderMagicLinkEmailHtml(validPayload);

      expect(html).toContain('app.venzory.com');
    });

    it('should include sign in button with URL', () => {
      const html = renderMagicLinkEmailHtml(validPayload);

      expect(html).toContain('Sign in');
      expect(html).toContain('magic123');
    });

    it('should include login code when provided', () => {
      const html = renderMagicLinkEmailHtml(validPayload);

      expect(html).toContain('123456');
      expect(html).toContain('10 minutes');
    });

    it('should not show code section when loginCode is null', () => {
      const html = renderMagicLinkEmailHtml({
        ...validPayload,
        loginCode: null,
      });

      expect(html).not.toContain('enter this code');
    });

    it('should render text version with code', () => {
      const text = renderMagicLinkEmailText(validPayload);

      expect(text).not.toContain('<');
      expect(text).toContain('123456');
      expect(text).toContain('magic123');
    });
  });

  describe('Order Email Template', () => {
    const validPayload = {
      practiceName: 'Downtown Veterinary',
      practiceAddress: '123 Main St\nNew York, NY 10001',
      supplierName: 'MedSupply Co',
      orderReference: 'ORD-2024-001',
      orderNotes: 'Please deliver before 3pm',
      items: [
        { name: 'Bandages (Large)', sku: 'BND-LG-001', quantity: 10, unitPrice: 5.99, total: 59.90 },
        { name: 'Antiseptic Spray', sku: null, quantity: 2, unitPrice: 12.50, total: 25.00 },
      ],
      orderTotal: 84.90,
    };

    it('should render HTML without crashing', () => {
      const html = renderOrderEmailHtml(validPayload);

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
    });

    it('should include practice name', () => {
      const html = renderOrderEmailHtml(validPayload);

      expect(html).toContain('Downtown Veterinary');
    });

    it('should include supplier name in greeting', () => {
      const html = renderOrderEmailHtml(validPayload);

      expect(html).toContain('Dear MedSupply Co');
    });

    it('should include order reference', () => {
      const html = renderOrderEmailHtml(validPayload);

      expect(html).toContain('ORD-2024-001');
    });

    it('should include practice address', () => {
      const html = renderOrderEmailHtml(validPayload);

      expect(html).toContain('123 Main St');
    });

    it('should include order notes', () => {
      const html = renderOrderEmailHtml(validPayload);

      expect(html).toContain('deliver before 3pm');
    });

    it('should include all items', () => {
      const html = renderOrderEmailHtml(validPayload);

      expect(html).toContain('Bandages (Large)');
      expect(html).toContain('BND-LG-001');
      expect(html).toContain('Antiseptic Spray');
    });

    it('should include order total', () => {
      const html = renderOrderEmailHtml(validPayload);

      expect(html).toContain('84.90');
    });

    it('should include preheader with item count and total', () => {
      const html = renderOrderEmailHtml(validPayload);

      // Preheader should mention items and total
      expect(html).toContain('2 item');
    });

    it('should render text version', () => {
      const text = renderOrderEmailText(validPayload);

      expect(text).not.toContain('<');
      expect(text).toContain('Downtown Veterinary');
      expect(text).toContain('84.90');
    });

    it('should handle missing optional fields', () => {
      const minimalPayload = {
        practiceName: 'Practice',
        supplierName: 'Supplier',
        orderReference: null,
        orderNotes: null,
        items: [],
        orderTotal: 0,
      };

      const html = renderOrderEmailHtml(minimalPayload);

      expect(html).toBeDefined();
      expect(html).toContain('No reference');
    });
  });
});

