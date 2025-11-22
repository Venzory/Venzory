import { Resend } from 'resend';
import type { PracticeRole } from '@prisma/client';
import { env } from '@/lib/env';
import logger from '@/lib/logger';

// Initialize Resend client - gracefully handle missing API key during build
export const resend = env.RESEND_API_KEY 
  ? new Resend(env.RESEND_API_KEY)
  : null;

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

interface SendOrderEmailParams {
  supplierEmail: string;
  supplierName: string;
  practiceName: string;
  practiceAddress: string | null;
  orderReference: string | null;
  orderNotes: string | null;
  orderItems: Array<{
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  orderTotal: number;
}

export async function sendPasswordResetEmail({
  email,
  token,
  name,
}: SendPasswordResetEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = env.NEXT_PUBLIC_APP_URL;
    const resetUrl = `${baseUrl}/auth/reset-password/${token}`;

    const displayName = name || 'there';

    // In development, ALWAYS log the email details for visibility, regardless of whether resend is configured
    if (process.env.NODE_ENV === 'development') {
      console.log('\n📨 EMAIL LOG (Dev Mode):', JSON.stringify({
        module: 'email',
        operation: 'sendPasswordResetEmail',
        resendInitialized: !!resend,
        email,
        subject: 'Reset your Venzory password',
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
          subject: 'Reset your Venzory password',
        }, 'Resend not configured - would send password reset email');
      }
      return { success: true };
    }

    const response = await resend.emails.send({
      from: 'Venzory <noreply@venzory.com>',
      to: email,
      subject: 'Reset your Venzory password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <div style="background: linear-gradient(to right, #0ea5e9, #0284c7); padding: 32px 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Reset Your Password</h1>
              </div>
              
              <div style="padding: 32px 24px;">
                <p style="margin: 0 0 16px; font-size: 16px;">Hi ${displayName},</p>
                
                <p style="margin: 0 0 16px; font-size: 16px;">
                  We received a request to reset your password for your Venzory account. 
                  Click the button below to create a new password:
                </p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetUrl}" 
                     style="display: inline-block; background-color: #0ea5e9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Reset Password
                  </a>
                </div>
                
                <p style="margin: 0 0 16px; font-size: 14px; color: #64748b;">
                  Or copy and paste this link into your browser:
                </p>
                
                <p style="margin: 0 0 24px; font-size: 14px; word-break: break-all; color: #0ea5e9;">
                  ${resetUrl}
                </p>
                
                <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 24px;">
                  <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">
                    This link will expire in 60 minutes for security reasons.
                  </p>
                  
                  <p style="margin: 0; font-size: 14px; color: #64748b;">
                    If you didn't request a password reset, you can safely ignore this email. 
                    Your password will remain unchanged.
                  </p>
                </div>
              </div>
              
              <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                  © ${new Date().getFullYear()} Venzory. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Hi ${displayName},

We received a request to reset your password for your Venzory account.

To reset your password, click the following link:
${resetUrl}

This link will expire in 60 minutes for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

© ${new Date().getFullYear()} Venzory. All rights reserved.
      `.trim(),
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
    const roleDisplay = role.charAt(0) + role.slice(1).toLowerCase();
    const inviter = inviterName || 'An administrator';

    // In development, ALWAYS log the email details for visibility
    if (process.env.NODE_ENV === 'development') {
      console.log('\n📨 EMAIL LOG (Dev Mode):', JSON.stringify({
        module: 'email',
        operation: 'sendUserInviteEmail',
        email,
        subject: `You've been invited to join ${practiceName}`,
        inviteUrl,
      }, null, 2), '\n');
    }

    if (!resend) {
      if (process.env.NODE_ENV !== 'development') {
        logger.warn({
          module: 'email',
          operation: 'sendUserInviteEmail',
          email,
          subject: `You've been invited to join ${practiceName}`,
        }, 'Resend not configured - would send invite email');
      }
      return { success: true }; // Don't fail in dev
    }

    const { data, error } = await resend.emails.send({
      from: 'Venzory <noreply@venzory.com>',
      to: email,
      subject: `You've been invited to join ${practiceName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <div style="background: linear-gradient(to right, #0ea5e9, #0284c7); padding: 32px 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">You're Invited!</h1>
              </div>
              
              <div style="padding: 32px 24px;">
                <p style="margin: 0 0 16px; font-size: 16px;">Hi there,</p>
                
                <p style="margin: 0 0 16px; font-size: 16px;">
                  ${inviter} has invited you to join <strong>${practiceName}</strong> on Venzory as a <strong>${roleDisplay}</strong>.
                </p>
                
                <p style="margin: 0 0 24px; font-size: 16px;">
                  Click the button below to accept the invitation and set up your account:
                </p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${inviteUrl}" 
                     style="display: inline-block; background-color: #0ea5e9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Accept Invitation
                  </a>
                </div>
                
                <p style="margin: 0 0 16px; font-size: 14px; color: #64748b;">
                  Or copy and paste this link into your browser:
                </p>
                
                <p style="margin: 0 0 24px; font-size: 14px; word-break: break-all; color: #0ea5e9;">
                  ${inviteUrl}
                </p>
                
                <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
                  <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">
                    <strong>Important:</strong> This invitation link will expire in 7 days for security reasons.
                  </p>
                  
                  <p style="margin: 0; font-size: 14px; color: #64748b;">
                    If you didn't expect this invitation, you can safely ignore this email.
                  </p>
                </div>
              </div>
              
              <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                  © ${new Date().getFullYear()} Venzory. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Hi there,

${inviter} has invited you to join ${practiceName} on Venzory as a ${roleDisplay}.

To accept the invitation and set up your account, click the following link:
${inviteUrl}

This invitation link will expire in 7 days for security reasons.

If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} Venzory. All rights reserved.
      `.trim(),
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

export async function sendOrderEmail({
  supplierEmail,
  supplierName,
  practiceName,
  practiceAddress,
  orderReference,
  orderNotes,
  orderItems,
  orderTotal,
}: SendOrderEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const reference = orderReference || 'No reference';
    
    if (!resend) {
      // In dev: log order details instead of crashing
      logger.warn({
        module: 'email',
        operation: 'sendOrderEmail',
        isDev: true,
        supplierEmail,
        supplierName,
        practiceName,
        practiceAddress,
        orderReference: reference,
        orderNotes,
        orderItems: orderItems.map(item => ({
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        orderTotal,
      }, 'Resend not configured - would send order email in production');
      return { success: true }; // Don't fail in dev
    }

    // Build order items HTML
    const itemsHtml = orderItems.map((item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 500; color: #1e293b;">${item.name}</div>
          ${item.sku ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">SKU: ${item.sku}</div>` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #64748b;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #64748b;">€${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500; color: #1e293b;">€${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    // Build order items plain text
    const itemsText = orderItems.map((item) => 
      `  ${item.name}${item.sku ? ` (${item.sku})` : ''}\n    Qty: ${item.quantity}, Unit Price: €${item.unitPrice.toFixed(2)}, Total: €${item.total.toFixed(2)}`
    ).join('\n\n');

    await resend.emails.send({
      from: 'Venzory <noreply@venzory.com>',
      to: supplierEmail,
      subject: `New Order from ${practiceName}${orderReference ? ` - ${orderReference}` : ''}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px;">
            <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <div style="background: linear-gradient(to right, #0ea5e9, #0284c7); padding: 32px 24px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Purchase Order</h1>
                <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0; font-size: 14px;">Reference: ${reference}</p>
              </div>
              
              <div style="padding: 32px 24px;">
                <p style="margin: 0 0 16px; font-size: 16px;">Dear ${supplierName},</p>
                
                <p style="margin: 0 0 24px; font-size: 16px;">
                  <strong>${practiceName}</strong> has placed a new order with you.
                </p>

                ${practiceAddress ? `
                  <div style="background-color: #f8fafc; border-left: 3px solid #0ea5e9; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;">Practice Address:</p>
                    <p style="margin: 4px 0 0; font-size: 14px; color: #64748b; white-space: pre-line;">${practiceAddress}</p>
                  </div>
                ` : ''}

                ${orderNotes ? `
                  <div style="background-color: #fffbeb; border-left: 3px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;">Order Notes:</p>
                    <p style="margin: 4px 0 0; font-size: 14px; color: #92400e; white-space: pre-line;">${orderNotes}</p>
                  </div>
                ` : ''}
                
                <h2 style="font-size: 18px; font-weight: 600; color: #1e293b; margin: 32px 0 16px;">Order Items</h2>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                  <thead>
                    <tr style="background-color: #f8fafc;">
                      <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Item</th>
                      <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Quantity</th>
                      <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Unit Price</th>
                      <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                  <tfoot>
                    <tr style="background-color: #f8fafc;">
                      <td colspan="3" style="padding: 16px; text-align: right; font-weight: 600; color: #1e293b; font-size: 16px;">Order Total</td>
                      <td style="padding: 16px; text-align: right; font-weight: 700; color: #0ea5e9; font-size: 18px;">€${orderTotal.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
                
                <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 24px;">
                  <p style="margin: 0; font-size: 14px; color: #64748b;">
                    If you have any questions about this order, please contact ${practiceName} directly.
                  </p>
                </div>
              </div>
              
              <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                  © ${new Date().getFullYear()} Venzory. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Purchase Order from ${practiceName}
Reference: ${reference}

Dear ${supplierName},

${practiceName} has placed a new order with you.

${practiceAddress ? `Practice Address:\n${practiceAddress}\n\n` : ''}${orderNotes ? `Order Notes:\n${orderNotes}\n\n` : ''}
Order Items:
${itemsText}

Order Total: €${orderTotal.toFixed(2)}

If you have any questions about this order, please contact ${practiceName} directly.

© ${new Date().getFullYear()} Venzory. All rights reserved.
      `.trim(),
    });

    return { success: true };
  } catch (error) {
    logger.error({
      module: 'email',
      operation: 'sendOrderEmail',
      supplierEmail,
      supplierName,
      practiceName,
      orderReference,
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to send order email');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

