/**
 * Email Service
 * 
 * Central abstraction for all email sending in Venzory.
 * 
 * Architecture rationale (B2B context):
 * - Single entry point ensures consistent logging, error handling, and environment safety
 * - Environment-aware: sandbox mode in non-production prevents accidental sends to real users
 * - Strong typing for all email payloads improves reliability and maintainability
 * - Structured logging enables debugging and support escalation
 * 
 * All email sending should go through this service rather than calling Resend directly.
 */

import { Resend } from 'resend';
import type { PracticeRole } from '@prisma/client';
import { env } from '@/lib/env';
import logger from '@/lib/logger';

// Re-export types for convenience
export type { PracticeRole };

// ============================================
// Types
// ============================================

/** Result of an email send operation */
export interface EmailResult {
  success: boolean;
  /** Error message if success is false */
  error?: string;
  /** Resend message ID if available */
  messageId?: string;
}

/** Params for password reset email */
export interface PasswordResetEmailParams {
  email: string;
  token: string;
  name: string | null;
}

/** Params for user invite email */
export interface UserInviteEmailParams {
  email: string;
  token: string;
  practiceName: string;
  role: PracticeRole;
  inviterName?: string;
}

/** Params for magic link email */
export interface MagicLinkEmailParams {
  email: string;
  /** Full magic link URL */
  url: string;
  /** Host for display (e.g., "app.venzory.com") */
  host: string;
  /** Optional 6-digit login code as fallback */
  loginCode?: string | null;
}

/** Single order item for email */
export interface OrderEmailItem {
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

/** Params for order email to supplier */
export interface OrderEmailParams {
  supplierEmail: string;
  supplierName: string;
  practiceName: string;
  practiceAddress: string | null;
  orderReference: string | null;
  orderNotes: string | null;
  items: OrderEmailItem[];
  orderTotal: number;
}

/** Internal email send params */
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Operation name for logging */
  operation: string;
  /** Additional context for logging */
  logContext?: Record<string, unknown>;
}

// ============================================
// Email Service Interface
// ============================================

export interface IEmailService {
  /** Send password reset email */
  sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<EmailResult>;
  
  /** Send user invite email */
  sendUserInviteEmail(params: UserInviteEmailParams): Promise<EmailResult>;
  
  /** Send magic link / login code email */
  sendMagicLinkEmail(params: MagicLinkEmailParams): Promise<EmailResult>;
  
  /** Send order email to supplier */
  sendOrderEmail(params: OrderEmailParams): Promise<EmailResult>;
}

// ============================================
// Implementation
// ============================================

class EmailServiceImpl implements IEmailService {
  private resend: Resend | null;
  
  constructor() {
    // Initialize Resend client - gracefully handle missing API key during build/dev
    this.resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  }

  /**
   * Determine the actual recipient based on environment
   * In non-production with DEV_EMAIL_RECIPIENT set, redirect all emails to dev inbox
   */
  private getEffectiveRecipient(originalRecipient: string): {
    recipient: string;
    isRedirected: boolean;
    originalRecipient?: string;
  } {
    const devRecipient = process.env.DEV_EMAIL_RECIPIENT;
    
    // Only redirect in non-production AND when DEV_EMAIL_RECIPIENT is explicitly set
    if (env.NODE_ENV !== 'production' && devRecipient) {
      return {
        recipient: devRecipient,
        isRedirected: true,
        originalRecipient,
      };
    }
    
    return {
      recipient: originalRecipient,
      isRedirected: false,
    };
  }

  /**
   * Get the from address - uses env.EMAIL_FROM for consistency
   */
  private getFromAddress(): string {
    // EMAIL_FROM is just the email, we wrap it with display name
    const email = env.EMAIL_FROM;
    return `Venzory <${email}>`;
  }

  /**
   * Core send method with logging and error handling
   */
  private async send(options: SendEmailOptions): Promise<EmailResult> {
    const { to: originalTo, subject: originalSubject, html, text, operation, logContext = {} } = options;

    // Apply environment-based recipient redirection
    const { recipient: to, isRedirected, originalRecipient } = this.getEffectiveRecipient(originalTo);
    const subject = isRedirected ? `[DEV] ${originalSubject} (was: ${originalRecipient})` : originalSubject;

    // Always log in development for visibility
    if (env.NODE_ENV === 'development') {
      console.log('\n📨 EMAIL LOG (Dev Mode):', JSON.stringify({
        module: 'email',
        operation,
        resendInitialized: !!this.resend,
        to,
        originalTo: isRedirected ? originalTo : undefined,
        subject,
        isRedirected,
        ...logContext,
      }, null, 2), '\n');
    }

    // If Resend not configured, return success without sending
    // This allows dev/test to proceed without email infrastructure
    if (!this.resend) {
      if (env.NODE_ENV !== 'development') {
        logger.warn({
          module: 'email',
          operation,
          to: originalTo,
          subject: originalSubject,
          ...logContext,
        }, 'Resend not configured - would send email');
      }
      return { success: true };
    }

    try {
      const response = await this.resend.emails.send({
        from: this.getFromAddress(),
        to,
        subject,
        html,
        text,
      });

      // Log raw response in development
      if (env.NODE_ENV === 'development') {
        console.log('\n📬 RESEND RESPONSE (Dev Mode):', JSON.stringify(response, null, 2), '\n');
      }

      const { data, error } = response;

      if (error) {
        logger.error({
          module: 'email',
          operation,
          to: originalTo,
          subject: originalSubject,
          resendError: error,
          ...logContext,
        }, 'Resend API returned error');
        
        return {
          success: false,
          error: error.message || 'Email send failed',
        };
      }

      logger.info({
        module: 'email',
        operation,
        to: originalTo,
        messageId: data?.id,
        isRedirected,
        ...logContext,
      }, 'Email sent successfully');

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      logger.error({
        module: 'email',
        operation,
        to: originalTo,
        subject: originalSubject,
        error: error instanceof Error ? error.message : String(error),
        ...logContext,
      }, 'Failed to send email');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }

  // ============================================
  // Public methods - defer to lib/email.ts for now
  // These will be refactored to use BaseEmailLayout
  // ============================================

  async sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<EmailResult> {
    // Import and delegate to existing implementation
    // This will be migrated to use templates directly
    const { sendPasswordResetEmail } = await import('@/lib/email');
    return sendPasswordResetEmail(params);
  }

  async sendUserInviteEmail(params: UserInviteEmailParams): Promise<EmailResult> {
    // Import and delegate to existing implementation
    const { sendUserInviteEmail } = await import('@/lib/email');
    return sendUserInviteEmail(params);
  }

  async sendMagicLinkEmail(params: MagicLinkEmailParams): Promise<EmailResult> {
    // Magic link is currently inline in auth.ts
    // For now, this is a placeholder - auth.ts will be updated to use this service
    throw new Error('sendMagicLinkEmail not yet implemented - use auth.ts sendVerificationRequest');
  }

  async sendOrderEmail(params: OrderEmailParams): Promise<EmailResult> {
    // Import and delegate to the active implementation
    const { sendOrderEmail } = await import('@/src/lib/email/sendOrderEmail');
    return sendOrderEmail({
      ...params,
      supplierEmail: params.supplierEmail,
    });
  }
}

// ============================================
// Singleton
// ============================================

let emailServiceInstance: IEmailService | null = null;

/**
 * Get singleton instance of EmailService
 */
export function getEmailService(): IEmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailServiceImpl();
  }
  return emailServiceInstance;
}

// Export class for testing
export { EmailServiceImpl };

