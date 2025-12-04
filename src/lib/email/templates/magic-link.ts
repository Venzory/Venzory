/**
 * Magic Link Email Template
 * 
 * Uses BaseEmailLayout for consistent styling across all Venzory emails.
 * Includes optional 6-digit login code as fallback for B2B use cases where
 * email scanners may invalidate links.
 */

import {
  renderBaseEmailLayout,
  renderEmailButton,
  renderEmailParagraph,
  EMAIL_STYLES,
} from './base-layout';

export interface MagicLinkEmailData {
  /** Host name for display (e.g., "app.venzory.com") */
  host: string;
  /** Full magic link URL */
  url: string;
  /** Optional 6-digit login code as fallback */
  loginCode?: string | null;
}

/**
 * Render magic link email HTML
 */
export function renderMagicLinkEmailHtml(data: MagicLinkEmailData): string {
  const { host, url, loginCode } = data;
  
  // Code section - shown if login code is provided
  const codeSection = loginCode ? `
    <div style="border-top: 1px solid ${EMAIL_STYLES.border}; padding-top: 24px; margin-top: 24px; text-align: center;">
      <p style="margin: 0 0 12px; font-size: 14px; color: ${EMAIL_STYLES.textSecondary};">
        Or enter this code on the login page:
      </p>
      <div style="font-size: 32px; font-family: 'Courier New', monospace; letter-spacing: 8px; color: ${EMAIL_STYLES.textPrimary}; font-weight: bold; background: ${EMAIL_STYLES.background}; padding: 16px 24px; border-radius: 8px; display: inline-block;">
        ${loginCode}
      </div>
      <p style="margin: 12px 0 0; font-size: 12px; color: ${EMAIL_STYLES.textMuted};">
        This code expires in 10 minutes
      </p>
    </div>
  ` : '';

  const content = `
    ${renderEmailParagraph(`Click the button below to sign in to <strong>${host}</strong>:`)}
    
    ${renderEmailButton({ href: url, text: 'Sign in' })}
    
    ${codeSection}
    
    <div style="margin-top: 24px;">
      ${renderEmailParagraph('If you did not request this email, you can safely ignore it.', { muted: true, small: true })}
    </div>
  `;

  return renderBaseEmailLayout({
    title: `Sign in to ${host}`,
    preheader: `Click to sign in to your Venzory account${loginCode ? ` or use code ${loginCode}` : ''}.`,
    content,
  });
}

/**
 * Render magic link email plain text
 */
export function renderMagicLinkEmailText(data: MagicLinkEmailData): string {
  const { host, url, loginCode } = data;
  const year = new Date().getFullYear();

  const codeSection = loginCode 
    ? `\n\nOr enter this code on the login page: ${loginCode}\n(Code expires in 10 minutes)` 
    : '';

  return `
Sign in to ${host}

Click this link to sign in:
${url}
${codeSection}

If you did not request this email, you can safely ignore it.

© ${year} Venzory. All rights reserved.
  `.trim();
}

