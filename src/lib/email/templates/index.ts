/**
 * Email Templates Index
 * 
 * Re-exports all email templates for convenient importing.
 */

// Base layout and utilities
export {
  renderBaseEmailLayout,
  renderEmailButton,
  renderEmailLink,
  renderEmailDivider,
  renderEmailParagraph,
  renderEmailInfoBox,
  EMAIL_STYLES,
  type BaseEmailLayoutOptions,
} from './base-layout';

// Password reset
export {
  renderPasswordResetEmailHtml,
  renderPasswordResetEmailText,
  type PasswordResetEmailData,
} from './password-reset';

// User invite
export {
  renderUserInviteEmailHtml,
  renderUserInviteEmailText,
  type UserInviteEmailData,
} from './user-invite';

// Magic link / Login code
export {
  renderMagicLinkEmailHtml,
  renderMagicLinkEmailText,
  type MagicLinkEmailData,
} from './magic-link';

// Order emails (in subdirectory)
export {
  renderOrderEmailHtml,
  type OrderEmailData,
} from './order/html';

export {
  renderOrderEmailText,
} from './order/text';

