/**
 * Password Reset Email Template
 * 
 * Uses BaseEmailLayout for consistent styling across all Venzory emails.
 */

import {
  renderBaseEmailLayout,
  renderEmailButton,
  renderEmailLink,
  renderEmailDivider,
  renderEmailParagraph,
} from './base-layout';

export interface PasswordResetEmailData {
  /** Display name for greeting (defaults to "there" if null) */
  name: string | null;
  /** Full password reset URL with token */
  resetUrl: string;
}

/**
 * Render password reset email HTML
 */
export function renderPasswordResetEmailHtml(data: PasswordResetEmailData): string {
  const displayName = data.name || 'there';
  
  const content = `
    ${renderEmailParagraph(`Hi ${displayName},`)}
    
    ${renderEmailParagraph(`We received a request to reset your password for your Venzory account. Click the button below to create a new password:`)}
    
    ${renderEmailButton({ href: data.resetUrl, text: 'Reset Password' })}
    
    ${renderEmailLink(data.resetUrl)}
    
    ${renderEmailDivider(`
      <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">
        This link will expire in 60 minutes for security reasons.
      </p>
      <p style="margin: 0; font-size: 14px; color: #64748b;">
        If you didn't request a password reset, you can safely ignore this email. 
        Your password will remain unchanged.
      </p>
    `)}
  `;

  return renderBaseEmailLayout({
    title: 'Reset Your Password',
    preheader: 'Click the link to reset your Venzory password. This link expires in 60 minutes.',
    content,
  });
}

/**
 * Render password reset email plain text
 */
export function renderPasswordResetEmailText(data: PasswordResetEmailData): string {
  const displayName = data.name || 'there';
  const year = new Date().getFullYear();

  return `
Hi ${displayName},

We received a request to reset your password for your Venzory account.

To reset your password, click the following link:
${data.resetUrl}

This link will expire in 60 minutes for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

© ${year} Venzory. All rights reserved.
  `.trim();
}

