
import { Resend } from 'resend';
import { env } from '@/lib/env';
import logger from '@/lib/logger';
import { renderOrderEmailHtml, OrderEmailData } from './templates/order/html';
import { renderOrderEmailText } from './templates/order/text';

// Initialize Resend client - gracefully handle missing API key during build
const resend = env.RESEND_API_KEY 
  ? new Resend(env.RESEND_API_KEY)
  : null;

export interface SendOrderEmailParams extends OrderEmailData {
  supplierEmail: string;
}

export async function sendOrderEmail(
  params: SendOrderEmailParams
): Promise<{ success: boolean; error?: string }> {
  const { supplierEmail, practiceName, orderReference, supplierName } = params;
  
  try {
    if (!resend) {
      // In dev: log order details instead of crashing
      logger.warn({
        module: 'email',
        operation: 'sendOrderEmail',
        isDev: true,
        supplierEmail,
        practiceName,
        supplierName,
        orderReference,
      }, 'Resend client not initialized - missing RESEND_API_KEY. Email would be sent in production.');
      
      return { success: true }; // Don't fail in dev if key is missing
    }

    const html = renderOrderEmailHtml(params);
    const text = renderOrderEmailText(params);
    const subject = `New Order from ${practiceName}${orderReference ? ` - ${orderReference}` : ''}`;

    await resend.emails.send({
      from: 'Remcura <noreply@remcura.com>',
      to: supplierEmail,
      subject,
      html,
      text,
    });

    logger.info({
      module: 'email',
      operation: 'sendOrderEmail',
      supplierEmail,
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

