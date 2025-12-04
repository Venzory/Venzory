/**
 * User Invite Email Template
 * 
 * Uses BaseEmailLayout for consistent styling across all Venzory emails.
 */

import type { PracticeRole } from '@prisma/client';
import {
  renderBaseEmailLayout,
  renderEmailButton,
  renderEmailLink,
  renderEmailDivider,
  renderEmailParagraph,
} from './base-layout';

export interface UserInviteEmailData {
  /** Practice name the user is being invited to */
  practiceName: string;
  /** Role being assigned (e.g., ADMIN, STAFF) */
  role: PracticeRole;
  /** Name of the person who sent the invite */
  inviterName?: string;
  /** Full invite URL with token */
  inviteUrl: string;
}

/**
 * Format role for display (e.g., "ADMIN" -> "Admin")
 */
function formatRole(role: PracticeRole): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

/**
 * Render user invite email HTML
 */
export function renderUserInviteEmailHtml(data: UserInviteEmailData): string {
  const inviter = data.inviterName || 'An administrator';
  const roleDisplay = formatRole(data.role);
  
  const content = `
    ${renderEmailParagraph('Hi there,')}
    
    ${renderEmailParagraph(`${inviter} has invited you to join <strong>${data.practiceName}</strong> on Venzory as a <strong>${roleDisplay}</strong>.`)}
    
    ${renderEmailParagraph('Click the button below to accept the invitation and set up your account:')}
    
    ${renderEmailButton({ href: data.inviteUrl, text: 'Accept Invitation' })}
    
    ${renderEmailLink(data.inviteUrl)}
    
    ${renderEmailDivider(`
      <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">
        <strong>Important:</strong> This invitation link will expire in 7 days for security reasons.
      </p>
      <p style="margin: 0; font-size: 14px; color: #64748b;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    `)}
  `;

  return renderBaseEmailLayout({
    title: "You're Invited!",
    preheader: `${inviter} has invited you to join ${data.practiceName} on Venzory.`,
    content,
  });
}

/**
 * Render user invite email plain text
 */
export function renderUserInviteEmailText(data: UserInviteEmailData): string {
  const inviter = data.inviterName || 'An administrator';
  const roleDisplay = formatRole(data.role);
  const year = new Date().getFullYear();

  return `
Hi there,

${inviter} has invited you to join ${data.practiceName} on Venzory as a ${roleDisplay}.

To accept the invitation and set up your account, click the following link:
${data.inviteUrl}

This invitation link will expire in 7 days for security reasons.

If you didn't expect this invitation, you can safely ignore this email.

© ${year} Venzory. All rights reserved.
  `.trim();
}

