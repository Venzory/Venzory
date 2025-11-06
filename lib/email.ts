import { Resend } from 'resend';
import type { PracticeRole } from '@prisma/client';

// Initialize Resend client - gracefully handle missing API key during build
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
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

export async function sendPasswordResetEmail({
  email,
  token,
  name,
}: SendPasswordResetEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    if (!resend) {
      console.error('[sendPasswordResetEmail] Resend client not initialized - missing RESEND_API_KEY');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/auth/reset-password/${token}`;
    const displayName = name || 'there';

    await resend.emails.send({
      from: 'Remcura <noreply@remcura.com>',
      to: email,
      subject: 'Reset your Remcura password',
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
                  We received a request to reset your password for your Remcura account. 
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
                  © ${new Date().getFullYear()} Remcura. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Hi ${displayName},

We received a request to reset your password for your Remcura account.

To reset your password, click the following link:
${resetUrl}

This link will expire in 60 minutes for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

© ${new Date().getFullYear()} Remcura. All rights reserved.
      `.trim(),
    });

    return { success: true };
  } catch (error) {
    console.error('[sendPasswordResetEmail]', error);
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/auth/accept-invite/${token}`;
    const roleDisplay = role.charAt(0) + role.slice(1).toLowerCase();
    const inviter = inviterName || 'An administrator';

    if (!resend) {
      // In dev: log invite details to console instead of crashing
      console.warn('[sendUserInviteEmail] ⚠️  Resend not configured - logging invite details instead:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📧 INVITE EMAIL (would be sent to: ${email})`);
      console.log(`   Practice: ${practiceName}`);
      console.log(`   Role: ${roleDisplay}`);
      console.log(`   Invited by: ${inviter}`);
      console.log(`   🔗 Invite URL: ${inviteUrl}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return { success: true }; // Don't fail in dev
    }

    await resend.emails.send({
      from: 'Remcura <noreply@remcura.com>',
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
                  ${inviter} has invited you to join <strong>${practiceName}</strong> on Remcura as a <strong>${roleDisplay}</strong>.
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
                  © ${new Date().getFullYear()} Remcura. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Hi there,

${inviter} has invited you to join ${practiceName} on Remcura as a ${roleDisplay}.

To accept the invitation and set up your account, click the following link:
${inviteUrl}

This invitation link will expire in 7 days for security reasons.

If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} Remcura. All rights reserved.
      `.trim(),
    });

    return { success: true };
  } catch (error) {
    console.error('[sendUserInviteEmail]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

