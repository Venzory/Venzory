import { Resend } from 'resend';
import type { PracticeRole } from '@prisma/client';
import { env } from '@/lib/env';
import logger from '@/lib/logger';
import {
  renderPasswordResetEmailHtml,
  renderPasswordResetEmailText,
} from '@/src/lib/email/templates/password-reset';
import {
  renderUserInviteEmailHtml,
  renderUserInviteEmailText,
} from '@/src/lib/email/templates/user-invite';

// Initialize Resend client - gracefully handle missing API key during build
export const resend = env.RESEND_API_KEY 
  ? new Resend(env.RESEND_API_KEY)
  : null;

/**
 * Get the effective recipient based on environment
 * In non-production with DEV_EMAIL_RECIPIENT set, redirect all emails to dev inbox
 * This prevents accidental sends to real users during development/staging
 */
function getEffectiveRecipient(originalRecipient: string): {
  recipient: string;
  subject: (original: string) => string;
  isRedirected: boolean;
} {
  const devRecipient = process.env.DEV_EMAIL_RECIPIENT;
  
  // Only redirect in non-production AND when DEV_EMAIL_RECIPIENT is explicitly set
  if (env.NODE_ENV !== 'production' && devRecipient) {
    return {
      recipient: devRecipient,
      subject: (original: string) => `[DEV] ${original} (was: ${originalRecipient})`,
      isRedirected: true,
    };
  }
  
  return {
    recipient: originalRecipient,
    subject: (original: string) => original,
    isRedirected: false,
  };
}

/**
 * Get the from address - standardized across all emails
 */
function getFromAddress(): string {
  return `Venzory <${env.EMAIL_FROM}>`;
}

interface SendPasswordResetEmailParams {
  email: string;
  token: string;
  name: string | null;
}

interface SendUserInviteEmailParams {
  email: string;
  token: string;
  practiceName: string;
  role: PracticeRole;
  inviterName?: string;
}

export async function sendPasswordResetEmail({
  email,
  token,
  name,
}: SendPasswordResetEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = env.NEXT_PUBLIC_APP_URL;
    const resetUrl = `${baseUrl}/auth/reset-password/${token}`;
    
    // Apply sandbox mode for non-production
    const { recipient, subject: makeSubject, isRedirected } = getEffectiveRecipient(email);
    const subject = makeSubject('Reset your Venzory password');

    // In development, ALWAYS log the email details for visibility, regardless of whether resend is configured
    if (process.env.NODE_ENV === 'development') {
      console.log('\n📨 EMAIL LOG (Dev Mode):', JSON.stringify({
        module: 'email',
        operation: 'sendPasswordResetEmail',
        resendInitialized: !!resend,
        originalRecipient: email,
        actualRecipient: recipient,
        isRedirected,
        subject,
        resetUrl,
      }, null, 2), '\n');
    }

    if (!resend) {
      // Log for production if not configured (already covered by dev log above, but good for consistency)
      if (process.env.NODE_ENV !== 'development') {
        logger.warn({
          module: 'email',
          operation: 'sendPasswordResetEmail',
          email,
          subject,
        }, 'Resend not configured - would send password reset email');
      }
      return { success: true };
    }

    // Use standardized templates from BaseEmailLayout
    const html = renderPasswordResetEmailHtml({ name, resetUrl });
    const text = renderPasswordResetEmailText({ name, resetUrl });

    const response = await resend.emails.send({
      from: getFromAddress(),
      to: recipient,
      subject,
      html,
      text,
    });

    // Force log the raw response in development
    if (process.env.NODE_ENV === 'development') {
      console.log('\n📬 RESEND RESPONSE (Dev Mode):', JSON.stringify(response, null, 2), '\n');
    }

    const { data, error } = response;

    return { success: true };
  } catch (error) {
    logger.error({
      module: 'email',
      operation: 'sendPasswordResetEmail',
      email,
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to send password reset email');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

export async function sendUserInviteEmail({
  email,
  token,
  practiceName,
  role,
  inviterName,
}: SendUserInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = env.NEXT_PUBLIC_APP_URL;
    const inviteUrl = `${baseUrl}/auth/accept-invite/${token}`;
    
    // Apply sandbox mode for non-production
    const { recipient, subject: makeSubject, isRedirected } = getEffectiveRecipient(email);
    const subject = makeSubject(`You've been invited to join ${practiceName}`);

    // In development, ALWAYS log the email details for visibility
    if (process.env.NODE_ENV === 'development') {
      console.log('\n📨 EMAIL LOG (Dev Mode):', JSON.stringify({
        module: 'email',
        operation: 'sendUserInviteEmail',
        originalRecipient: email,
        actualRecipient: recipient,
        isRedirected,
        subject,
        inviteUrl,
      }, null, 2), '\n');
    }

    if (!resend) {
      if (process.env.NODE_ENV !== 'development') {
        logger.warn({
          module: 'email',
          operation: 'sendUserInviteEmail',
          email,
          subject,
        }, 'Resend not configured - would send invite email');
      }
      return { success: true }; // Don't fail in dev
    }

    // Use standardized templates from BaseEmailLayout
    const html = renderUserInviteEmailHtml({
      practiceName,
      role,
      inviterName,
      inviteUrl,
    });
    const text = renderUserInviteEmailText({
      practiceName,
      role,
      inviterName,
      inviteUrl,
    });

    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: recipient,
      subject,
      html,
      text,
    });

    return { success: true };
  } catch (error) {
    logger.error({
      module: 'email',
      operation: 'sendUserInviteEmail',
      email,
      practiceName,
      role,
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to send user invite email');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

