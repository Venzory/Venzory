import { Resend } from 'resend';
import { env } from '@/lib/env';
import logger from '@/lib/logger';
import { renderOrderEmailHtml, OrderEmailData } from './templates/order/html';
import { renderOrderEmailText } from './templates/order/text';

// Initialize Resend client - gracefully handle missing API key during build
const resend = env.RESEND_API_KEY 
  ? new Resend(env.RESEND_API_KEY)
  : null;

/**
 * Get the effective recipient based on environment
 * In non-production with DEV_EMAIL_RECIPIENT set, redirect all emails to dev inbox
 */
function getEffectiveRecipient(originalRecipient: string): {
  recipient: string;
  subject: (original: string) => string;
  isRedirected: boolean;
} {
  const devRecipient = process.env.DEV_EMAIL_RECIPIENT;
  
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

export interface SendOrderEmailParams extends OrderEmailData {
  supplierEmail: string;
}

export async function sendOrderEmail(
  params: SendOrderEmailParams
): Promise<{ success: boolean; error?: string }> {
  const { supplierEmail, practiceName, orderReference, supplierName } = params;
  
  // Apply sandbox mode for non-production
  const { recipient, subject: makeSubject, isRedirected } = getEffectiveRecipient(supplierEmail);
  const baseSubject = `New Order from ${practiceName}${orderReference ? ` - ${orderReference}` : ''}`;
  const subject = makeSubject(baseSubject);
  
  try {
    if (!resend) {
      // In dev: log order details instead of crashing
      logger.warn({
        module: 'email',
        operation: 'sendOrderEmail',
        isDev: true,
        originalRecipient: supplierEmail,
        actualRecipient: recipient,
        isRedirected,
        practiceName,
        supplierName,
        orderReference,
      }, 'Resend client not initialized - missing RESEND_API_KEY. Email would be sent in production.');
      
      return { success: true }; // Don't fail in dev if key is missing
    }

    const html = renderOrderEmailHtml(params);
    const text = renderOrderEmailText(params);

    await resend.emails.send({
      from: getFromAddress(),
      to: recipient,
      subject,
      html,
      text,
    });

    logger.info({
      module: 'email',
      operation: 'sendOrderEmail',
      originalRecipient: supplierEmail,
      actualRecipient: recipient,
      isRedirected,
      orderReference,
    }, 'Order email sent successfully');

    return { success: true };
  } catch (error) {
    logger.error({
      module: 'email',
      operation: 'sendOrderEmail',
      supplierEmail,
      orderReference,
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to send order email');

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

