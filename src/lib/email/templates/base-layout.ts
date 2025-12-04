/**
 * Base Email Layout Component
 * 
 * Provides consistent styling and structure for all Venzory emails.
 * 
 * Design rationale (B2B context):
 * - Professional appearance with consistent branding builds trust
 * - Mobile-responsive for on-the-go access (common in B2B)
 * - Clear hierarchy and scannable content for busy professionals
 * - Preheader text improves email preview in clients
 * - Footer with support info aids debugging and customer service
 */

// Email design tokens - centralized for consistency
export const EMAIL_STYLES = {
  // Colors
  primaryColor: '#0ea5e9',        // Sky blue - Venzory brand
  primaryDark: '#0284c7',         // Darker blue for gradients
  textPrimary: '#1e293b',         // Slate 800 - main text
  textSecondary: '#64748b',       // Slate 500 - secondary text
  textMuted: '#94a3b8',           // Slate 400 - footer text
  background: '#f8fafc',          // Slate 50 - email background
  cardBackground: '#ffffff',      // White - content card
  border: '#e2e8f0',              // Slate 200 - dividers
  
  // Typography
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  
  // Dimensions
  maxWidth: '600px',              // Standard email width
  borderRadius: '12px',
  
  // Spacing
  headerPadding: '32px 24px',
  contentPadding: '32px 24px',
  footerPadding: '24px',
} as const;

export interface BaseEmailLayoutOptions {
  /** Main heading displayed in the header banner */
  title: string;
  /** Optional subtitle shown below the title in the header */
  subtitle?: string;
  /** Preheader text - shown in email client preview (40-130 chars recommended) */
  preheader?: string;
  /** Main email content (HTML string) */
  content: string;
  /** Optional footer content to add above copyright */
  footerContent?: string;
  /** Year for copyright (defaults to current year) */
  year?: number;
}

/**
 * Renders the base HTML email layout with consistent styling
 * 
 * @example
 * ```ts
 * const html = renderBaseEmailLayout({
 *   title: 'Reset Your Password',
 *   preheader: 'Click the link below to reset your Venzory password',
 *   content: '<p>Hi there, click below to reset...</p>',
 * });
 * ```
 */
export function renderBaseEmailLayout(options: BaseEmailLayoutOptions): string {
  const {
    title,
    subtitle,
    preheader,
    content,
    footerContent,
    year = new Date().getFullYear(),
  } = options;

  const styles = EMAIL_STYLES;

  // Preheader trick: hidden text that shows in email client preview
  // Followed by whitespace to prevent content from bleeding into preview
  const preheaderHtml = preheader
    ? `
      <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
        ${preheader}
      </div>
      <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
      </div>
    `
    : '';

  const subtitleHtml = subtitle
    ? `<p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0; font-size: 14px;">${subtitle}</p>`
    : '';

  const footerContentHtml = footerContent
    ? `<div style="margin-bottom: 16px;">${footerContent}</div>`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>${title}</title>
    <!--[if mso]>
    <style type="text/css">
      table { border-collapse: collapse; }
      .content { width: 600px !important; }
    </style>
    <![endif]-->
  </head>
  <body style="font-family: ${styles.fontFamily}; line-height: 1.6; color: ${styles.textPrimary}; background-color: ${styles.background}; margin: 0; padding: 20px;">
    ${preheaderHtml}
    
    <div style="max-width: ${styles.maxWidth}; margin: 0 auto; background-color: ${styles.cardBackground}; border-radius: ${styles.borderRadius}; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(to right, ${styles.primaryColor}, ${styles.primaryDark}); padding: ${styles.headerPadding}; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${title}</h1>
        ${subtitleHtml}
      </div>
      
      <!-- Content -->
      <div style="padding: ${styles.contentPadding};">
        ${content}
      </div>
      
      <!-- Footer -->
      <div style="background-color: ${styles.background}; padding: ${styles.footerPadding}; text-align: center; border-top: 1px solid ${styles.border};">
        ${footerContentHtml}
        <p style="margin: 0; font-size: 12px; color: ${styles.textMuted};">
          &copy; ${year} Venzory. All rights reserved.
        </p>
      </div>
    </div>
  </body>
</html>
  `.trim();
}

/**
 * Renders a primary CTA button with consistent styling
 */
export function renderEmailButton(options: {
  href: string;
  text: string;
  /** Align button: 'center' (default), 'left', 'right' */
  align?: 'center' | 'left' | 'right';
}): string {
  const { href, text, align = 'center' } = options;
  const styles = EMAIL_STYLES;

  return `
    <div style="text-align: ${align}; margin: 32px 0;">
      <a href="${href}" 
         style="display: inline-block; background-color: ${styles.primaryColor}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        ${text}
      </a>
    </div>
  `;
}

/**
 * Renders a URL display with fallback copy-paste link
 */
export function renderEmailLink(url: string): string {
  const styles = EMAIL_STYLES;

  return `
    <p style="margin: 0 0 16px; font-size: 14px; color: ${styles.textSecondary};">
      Or copy and paste this link into your browser:
    </p>
    <p style="margin: 0 0 24px; font-size: 14px; word-break: break-all; color: ${styles.primaryColor};">
      ${url}
    </p>
  `;
}

/**
 * Renders a divider with content below it (for secondary info)
 */
export function renderEmailDivider(content: string): string {
  const styles = EMAIL_STYLES;

  return `
    <div style="border-top: 1px solid ${styles.border}; padding-top: 24px; margin-top: 24px;">
      ${content}
    </div>
  `;
}

/**
 * Renders a paragraph with standard styling
 */
export function renderEmailParagraph(
  text: string,
  options?: { muted?: boolean; small?: boolean }
): string {
  const styles = EMAIL_STYLES;
  const color = options?.muted ? styles.textSecondary : styles.textPrimary;
  const fontSize = options?.small ? '14px' : '16px';

  return `<p style="margin: 0 0 16px; font-size: ${fontSize}; color: ${color};">${text}</p>`;
}

/**
 * Renders an info box (callout) with left border accent
 */
export function renderEmailInfoBox(options: {
  title?: string;
  content: string;
  /** 'info' (blue), 'warning' (amber), 'success' (green) */
  variant?: 'info' | 'warning' | 'success';
}): string {
  const { title, content, variant = 'info' } = options;
  const styles = EMAIL_STYLES;

  const variantStyles = {
    info: { bg: '#f0f9ff', border: styles.primaryColor, text: styles.textSecondary },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
    success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
  };

  const vs = variantStyles[variant];

  const titleHtml = title
    ? `<p style="margin: 0; font-size: 14px; font-weight: 600; color: ${styles.textPrimary};">${title}</p>`
    : '';

  return `
    <div style="background-color: ${vs.bg}; border-left: 3px solid ${vs.border}; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
      ${titleHtml}
      <p style="margin: ${title ? '4px' : '0'} 0 0; font-size: 14px; color: ${vs.text}; white-space: pre-line;">${content}</p>
    </div>
  `;
}

